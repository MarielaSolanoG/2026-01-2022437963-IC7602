const express = require("express");
const db = require("../firebase");

const router = express.Router();

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email y password son requeridos",
            });
        }

        const snapshot = await db
            .collection("users")
            .where("email", "==", email)
            .where("password", "==", password)
            .where("role", "==", "admin")
            .get();

        if (snapshot.empty) {
            return res.status(401).json({
                message: "Credenciales inválidas",
            });
        }

        const doc = snapshot.docs[0];

        const user = {
            id: doc.id,
            ...doc.data(),
        };

        delete user.password;

        res.json({
            token: `admin-${Date.now()}`,
            user,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Error en login",
        });
    }
});

router.post("/verify", async (req, res) => {
    try {
        const { username, password, domain } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Usuario y password son requeridos",
            });
        }

        const doc = await db
            .collection("users")
            .doc(username)
            .get();

        if (!doc.exists) {
            return res.status(401).json({
                message: "Credenciales inválidas",
            });
        }

        const user = doc.data();

        if (user.password !== password) {
            return res.status(401).json({
                message: "Credenciales inválidas",
            });
        }

        res.json({
            token: `session-${Date.now()}`,
            username,
            domain,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Error verificando usuario",
        });
    }
});

module.exports = router;