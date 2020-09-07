import { Router } from 'express';

import multer from 'multer';
import uploadConfig from '../config/upload';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import { getCustomRepository } from 'typeorm';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';


const upload = multer(uploadConfig);

const transactionsRouter = Router();

transactionsRouter.get('/', async (request, response) => {
  
  const transactionsRepository = getCustomRepository(TransactionsRepository);

  const balance = await transactionsRepository.getBalance();

  const transactions = await transactionsRepository.find();

  return response.json({ transactions, balance } );

});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;
  
  const createTransaction = new CreateTransactionService();

  const transaction = await createTransaction.execute({title, value, type, category});

  return response.json(transaction);

});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;
  
  const deleteService = new DeleteTransactionService();

  await deleteService.execute(id);

  return response.status(204).send();

});

transactionsRouter.post('/import', upload.single('file'),async (request, response) => {
  
  const importTransactions = new ImportTransactionsService();

  const transactions = await importTransactions.execute(request.file.path);

  return response.json(transactions);

});

export default transactionsRouter;
