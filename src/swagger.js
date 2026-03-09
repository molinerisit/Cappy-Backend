const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Cappy Cooklevel API',
      version: '1.0.0',
      description: 'API backend para aprendizaje gamificado de cocina',
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/auth.routes.js', './src/routes/admin.routes.js'],
};

const specs = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

module.exports = setupSwagger;
