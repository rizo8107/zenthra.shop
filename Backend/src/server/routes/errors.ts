import { Router } from 'express';

const router = Router();

// Generic 404 handler for undefined API routes
router.all('*', (req, res) => {
  res.status(404).json({
    message: `Route ${req.method}:${req.originalUrl} not found`,
    error: 'Not Found',
    statusCode: 404,
  });
});

export default router;
