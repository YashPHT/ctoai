const express = require('express');
const router = express.Router();
const assessmentsController = require('../controllers/assessmentsController');

router.get('/', assessmentsController.getAssessments);

module.exports = router;
