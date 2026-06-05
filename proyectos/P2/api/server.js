require("dotenv").config();
const bcrypt = require("bcryptjs");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const db = require("./firebase");
const { requireAuth } = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
    res.json({ message: "API running" });
});

app.get("/domains", requireAuth, async (req, res) => {
    try {
        const snapshot = await db.collection("domains").get();

        const domains = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json(domains);
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error obteniendo dominios" });
    }
});

app.get("/domains/:domain/config", requireAuth, async (req, res) => {
    try {
        const domain = req.params.domain;

        const doc = await db.collection("domains").doc(domain).get();

        if (!doc.exists) {
            return res.status(404).json({ message: "No existe" });
        }

        res.json(doc.data());
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error obteniendo configuración" });
    }
});

app.post("/domains", requireAuth, async (req, res) => {
    try {
        const data = req.body;

        if (!data.domain) {
            return res.status(400).json({ message: "domain requerido" });
        }

        const txtRecord = `proyecto2-verify=${Math.random().toString(36).slice(2)}`

        const domainData = {
            domain: data.domain,
            ttl: data.ttl ?? 3600,
            cache_size_mb: data.cache_size_mb ?? 100,
            replacement_policy: data.replacement_policy ?? "LRU",
            auth_type: data.auth_type ?? "none",
            api_key: data.api_key ?? "abc123",
            verified: data.verified ?? false,
            txtRecord,  // ahora sí se guarda en Firebase
        };

        await db.collection("domains").doc(data.domain).set(domainData);

        res.status(201).json({
            id: data.domain,
            name: data.domain,
            ...domainData,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error creando dominio" });
    }
});

app.delete("/domains/:domain", requireAuth, async (req, res) => {
    try {
        await db.collection("domains").doc(req.params.domain).delete();

        res.json({ deleted: true });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error eliminando dominio" });
    }
});

/*
GET URLS POR DOMINIO
*/

app.get("/domains/:domain/urls", requireAuth, async (req, res) => {
    try {
        const { domain } = req.params;

        const snapshot = await db
            .collection("domains")
            .doc(domain)
            .collection("urls")
            .get();

        const urls = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json(urls);
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Error obteniendo URLs del dominio",
        });
    }
});

/*
CREAR URL PARA DOMINIO
*/

app.post("/domains/:domain/urls", requireAuth, async (req, res) => {
    try {
        const { domain } = req.params;
        const data = req.body;

        const urlData = {
            pattern: data.pattern,
            cacheSize: data.cacheSize ?? 100,
            fileTypes: data.fileTypes ?? [],
            authType: data.authType ?? "none",
            createdAt: new Date().toISOString(),
        };

        if (!urlData.pattern) {
            return res.status(400).json({
                message: "pattern requerido",
            });
        }

        const ref = await db
            .collection("domains")
            .doc(domain)
            .collection("urls")
            .add(urlData);

        res.status(201).json({
            id: ref.id,
            ...urlData,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Error creando URL",
        });
    }
});

/*
ACTUALIZAR URL
*/

app.put("/domains/:domain/urls/:urlId", requireAuth, async (req, res) => {
    try {
        const { domain, urlId } = req.params;
        const data = req.body;

        await db
            .collection("domains")
            .doc(domain)
            .collection("urls")
            .doc(urlId)
            .update(data);

        res.json({
            id: urlId,
            ...data,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Error actualizando URL",
        });
    }
});

/*
ELIMINAR URL
*/

app.delete("/domains/:domain/urls/:urlId", requireAuth, async (req, res) => {
    try {
        const { domain, urlId } = req.params;

        await db
            .collection("domains")
            .doc(domain)
            .collection("urls")
            .doc(urlId)
            .delete();

        res.json({
            deleted: true,
            id: urlId,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Error eliminando URL",
        });
    }
});

async function findUrlRefById(urlId) {
    const domainsSnapshot = await db.collection("domains").get();
    
    for (const domainDoc of domainsSnapshot.docs) {
        const urlRef = db
            .collection("domains")
            .doc(domainDoc.id)
            .collection("urls")
            .doc(urlId);

        const urlDoc = await urlRef.get();

        if (urlDoc.exists) {
            return urlRef;
        }
    }

    return null;
}

/*
GET API KEYS POR URL
*/

app.get("/urls/:urlId/apikeys", requireAuth, async (req, res) => {
    try {
        const { urlId } = req.params;

        const urlRef = await findUrlRefById(urlId);

        if (!urlRef) {  
            return res.status(404).json({
                message: "URL no encontrada",
            });
        }

        const keysSnapshot = await urlRef
            .collection("apikeys")
            .get();

        const keys = keysSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json(keys);
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Error obteniendo API Keys",
        });
    }
});

/*
CREAR API KEY PARA URL
*/

app.post("/urls/:urlId/apikeys", requireAuth, async (req, res) => {
    try {
        const { urlId } = req.params;

        const urlRef = await findUrlRefById(urlId);

        if (!urlRef) {
            return res.status(404).json({
                message: "URL no encontrada",
            });
        }

        const keyData = {
            key: `ak-${Math.random().toString(36).slice(2)}`,
            createdAt: new Date().toISOString(),
        };

        const ref = await urlRef
            .collection("apikeys")
            .add(keyData);

        res.status(201).json({
            id: ref.id,
            ...keyData,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Error creando API Key",
        });
    }
});

/*
ELIMINAR API KEY
*/

app.delete("/urls/:urlId/apikeys/:keyId", requireAuth, async (req, res) => {
    try {
        const { urlId, keyId } = req.params;

        const urlRef = await findUrlRefById(urlId);

        if (!urlRef) {
            return res.status(404).json({
                message: "URL no encontrada",
            });
        }

        await urlRef
            .collection("apikeys")
            .doc(keyId)
            .delete();

        res.json({
            deleted: true,
            id: keyId,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Error eliminando API Key",
        });
    }
});

/*
GET USUARIOS POR URL
*/
app.get("/urls/:urlId/users", requireAuth, async (req, res) => {
    try {
        const { urlId } = req.params;
        const urlRef = await findUrlRefById(urlId);

        if (!urlRef) {
            return res.status(404).json({ message: "URL no encontrada" });
        }

        const snapshot = await urlRef.collection("users").get();

        const users = snapshot.docs.map((doc) => ({
            id: doc.id,
            username: doc.data().username,
            // nunca devolvemos el password
        }));

        res.json(users);
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error obteniendo usuarios" });
    }
});

/*
CREAR USUARIO PARA URL
*/
app.post("/urls/:urlId/users", requireAuth, async (req, res) => {
    try {
        const { urlId } = req.params;
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "username y password requeridos" });
        }

        const urlRef = await findUrlRefById(urlId);

        if (!urlRef) {
            return res.status(404).json({ message: "URL no encontrada" });
        }

        // Hashea la contraseña antes de guardar
        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            username,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
        };

        const ref = await urlRef.collection("users").add(userData);

        res.status(201).json({
            id: ref.id,
            username,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error creando usuario" });
    }
});

/*
ACTUALIZAR USUARIO
*/
app.put("/urls/:urlId/users/:userId", requireAuth, async (req, res) => {
    try {
        const { urlId, userId } = req.params;
        const { username, password } = req.body;

        const urlRef = await findUrlRefById(urlId);

        if (!urlRef) {
            return res.status(404).json({ message: "URL no encontrada" });
        }

        const updateData = { username };

        // Solo actualiza password si viene en el body
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        await urlRef.collection("users").doc(userId).update(updateData);

        res.json({ id: userId, username });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error actualizando usuario" });
    }
});

/*
ELIMINAR USUARIO
*/
app.delete("/urls/:urlId/users/:userId", requireAuth, async (req, res) => {
    try {
        const { urlId, userId } = req.params;

        const urlRef = await findUrlRefById(urlId);

        if (!urlRef) {
            return res.status(404).json({ message: "URL no encontrada" });
        }

        await urlRef.collection("users").doc(userId).delete();

        res.json({ deleted: true, id: userId });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error eliminando usuario" });
    }
});

/*
VERIFICAR DOMINIO POR REGISTRO TXT
*/
app.post("/domains/:domain/verify", requireAuth, async (req, res) => {
    try {
        const { domain } = req.params;

        const doc = await db.collection("domains").doc(domain).get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Dominio no encontrado" });
        }

        const domainData = doc.data();

        if (!domainData.txtRecord) {
            return res.status(400).json({ message: "Este dominio no tiene txtRecord generado" });
        }

        const dns = require("dns").promises;

        let txtRecords = [];
        try {
            txtRecords = await dns.resolveTxt(domain);
        } catch (dnsError) {
            return res.status(200).json({
                verified: false,
                message: "No se encontraron registros TXT para este dominio"
            });
        }

        const allRecords = txtRecords.flat();
        const isVerified = allRecords.includes(domainData.txtRecord);

        if (isVerified) {
            await db.collection("domains").doc(domain).update({ verified: true });
        }

        res.json({
            verified: isVerified,
            message: isVerified
                ? "Dominio verificado correctamente"
                : "Registro TXT no encontrado. Asegurate de haberlo agregado a tu DNS."
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error verificando dominio" });
    }
});

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`API http://localhost:${PORT}`);
    });
}

module.exports = app;