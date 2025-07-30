import express from 'express';
import validateIdMiddleware from '../middlewares/validateIdMiddleware.js';
import { deleteFile, getFile, renameFile, uploadFile } from '../controllers/fileController.js';
const router = express.Router();

router.param('id', validateIdMiddleware);
router.param('parentDirId', validateIdMiddleware);

/* 
================================
CREATE
================================
*/
router.post('/:parentDirId?', uploadFile);

/* 
================================
READ
================================
*/
router.get('/:id', getFile);

/* 
================================
UPDATE
================================
*/
router.patch('/:id', renameFile);

/* 
================================
DELETE
================================
*/
router.delete('/:id', deleteFile);

export default router;
