const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const db = require("./firebase");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
    res.json({ message: "API running" });
});

app.get("/domains", async (req, res) => {
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

app.get("/domains/:domain/config", async (req, res) => {
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

app.post("/domains", async (req, res) => {
    try {
        const data = req.body;

        if (!data.domain) {
            return res.status(400).json({ message: "domain requerido" });
        }

        const domainData = {
            domain: data.domain,
            ttl: data.ttl ?? 3600,
            cache_size_mb: data.cache_size_mb ?? 100,
            replacement_policy: data.replacement_policy ?? "LRU",
            auth_type: data.auth_type ?? "none",
            api_key: data.api_key ?? "abc123",
            verified: data.verified ?? false,
        };

        await db.collection("domains").doc(data.domain).set(domainData);

        res.status(201).json({
            id: data.domain,
            ...domainData,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Error creando dominio" });
    }
});

app.delete("/domains/:domain", async (req, res) => {
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

app.get("/domains/:domain/urls", async (req, res) => {
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

app.post("/domains/:domain/urls", async (req, res) => {
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

app.put("/domains/:domain/urls/:urlId", async (req, res) => {
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

app.delete("/domains/:domain/urls/:urlId", async (req, res) => {
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

app.get("/urls/:urlId/apikeys", async (req, res) => {
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

app.post("/urls/:urlId/apikeys", async (req, res) => {
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

app.delete("/urls/:urlId/apikeys/:keyId", async (req, res) => {
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

app.listen(3000, () => {
    console.log("API http://localhost:3000");
});