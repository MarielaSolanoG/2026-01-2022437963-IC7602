const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../firebase");

const router = express.Router();

// --- REGISTER ---
router.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email y password requeridos" });
        }

        // Verifica que el email no exista ya
        const existing = await db
            .collection("users")
            .where("email", "==", email)
            .get();

        if (!existing.empty) {
            return res.status(409).json({ message: "El email ya está registrado" });
        }

        // Hashea la contraseña — nunca se guarda en texto plano
        // El número 10 es el "salt rounds" — más alto = más seguro pero más lento
        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            email,
            password: hashedPassword,
            role: "admin",
            createdAt: new Date().toISOString(),
        };

        const ref = await db.collection("users").add(userData);

        // Genera el token JWT
        const token = jwt.sign(
            { userId: ref.id, email },          // payload — datos que guarda el token
            process.env.JWT_SECRET,              // clave secreta para firmarlo
            { expiresIn: "24h" }                 // expira en 24 horas
        );

        res.status(201).json({
            token,
            user: { id: ref.id, email },
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error en registro" });
    }
});

// --- LOGIN ---
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email y password requeridos" });
        }

        const snapshot = await db
            .collection("users")
            .where("email", "==", email)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        const doc = snapshot.docs[0];
        const user = doc.data();

        // Compara la contraseña con el hash guardado
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        const token = jwt.sign(
            { userId: doc.id, email },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            token,
            user: { id: doc.id, email },
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error en login" });
    }
});

// --- LOGOUT ---
// JWT es stateless — no hay sesión que destruir en el servidor
// El cliente simplemente borra el token de su lado
// Este endpoint existe para que la UI tenga algo a donde llamar
router.post("/logout", (req, res) => {
    res.json({ message: "Sesión cerrada" });
});

// --- VERIFY (para Zonal Cache) ---
router.post("/verify", async (req, res) => {
    try {
        const { username, password, domain } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Usuario y password requeridos" });
        }

        // Busca el usuario en la subcolección users de la URL correspondiente
        // Primero encontramos la URL del dominio
        const domainDoc = await db.collection("domains").doc(domain).get();

        if (!domainDoc.exists) {
            return res.status(404).json({ message: "Dominio no encontrado" });
        }

        // Busca en todos los users de todas las URLs de ese dominio
        const urlsSnapshot = await db
            .collection("domains")
            .doc(domain)
            .collection("urls")
            .get();

        let foundUser = null;

        for (const urlDoc of urlsSnapshot.docs) {
            const usersSnapshot = await urlDoc.ref
                .collection("users")
                .where("username", "==", username)
                .get();

            if (!usersSnapshot.empty) {
                foundUser = usersSnapshot.docs[0].data();
                break;
            }
        }

        if (!foundUser) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        const passwordMatch = await bcrypt.compare(password, foundUser.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        const token = jwt.sign(
            { username, domain },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ token, username, domain });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error verificando usuario" });
    }
});

module.exports = router;