const express = require('express');
const router = express.Router();

router.use((_req, res) => {
	return res.status(410).json({
		message: 'El módulo de Cultura está deshabilitado',
		code: 'CULTURE_DISABLED'
	});
});

module.exports = router;
