import { Router } from 'express';
import { reorderItinerary } from '../lib/itinerary.js';

const router = Router();
router.post('/', (req, res) => {
  try {
    return res.json(reorderItinerary(req.body?.itinerary, req.body?.activityIds, req.body?.constraints));
  } catch (error) {
    return res.status(422).json({ error: error.message });
  }
});
export default router;
