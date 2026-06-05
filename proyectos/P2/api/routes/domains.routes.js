const express = require("express");
const db = require("../firebase");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("domains").get();

    const domains = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(domains);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error getting domains" });
  }
});

router.get("/:domain/config", async (req, res) => {
  try {
    const { domain } = req.params;

    const doc = await db.collection("domains").doc(domain).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Domain config not found" });
    }

    res.json(doc.data());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error getting domain config" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      domain,
      ttl = 3600,
      cache_size_mb = 100,
      replacement_policy = "LRU",
      auth_type = "none",
      api_key = "abc123",
    } = req.body;

    if (!domain) {
      return res.status(400).json({ message: "Domain is required" });
    }

    const data = {
      domain,
      ttl,
      cache_size_mb,
      replacement_policy,
      auth_type,
      api_key,
      verified: false,
    };

    await db.collection("domains").doc(domain).set(data);

    res.status(201).json({
      id: domain,
      ...data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating domain" });
  }
});

router.delete("/:domain", async (req, res) => {
  try {
    const { domain } = req.params;

    await db.collection("domains").doc(domain).delete();

    res.json({ message: "Domain deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting domain" });
  }
});

module.exports = router;