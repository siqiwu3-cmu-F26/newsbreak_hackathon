const express = require("express");
const { getEnvironmentContext } = require("../services/environment");

const router = express.Router();

router.get("/", async (req, res) => {
  const context = await getEnvironmentContext({
    query: req.query.location || "Palo Alto, CA",
    lat: req.query.lat,
    lng: req.query.lng,
    date: req.query.date,
  });
  res.json(context);
});

module.exports = router;
