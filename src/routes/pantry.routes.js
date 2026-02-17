const express = require('express');
const router = express.Router();
const pantryController = require('../controllers/pantry.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', pantryController.getPantry);
router.post('/', pantryController.addIngredient);
router.delete('/:id', pantryController.deleteIngredient);

module.exports = router;
