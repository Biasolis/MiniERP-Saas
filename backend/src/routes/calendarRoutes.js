const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', calendarController.getEvents);
router.post('/', calendarController.createEvent); // <--- NOVO

module.exports = router;