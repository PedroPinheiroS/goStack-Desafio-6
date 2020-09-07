import csvParse from 'csv-parse';
import fs from 'fs';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import { getCustomRepository, getRepository, In } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CsvTransaction{
  title: string,
  value: number,
  type: 'income'|'outcome',
  category: string
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {

    const transactionRepository = getCustomRepository(TransactionsRepository);

    const categoriesRepository = getRepository(Category);

    const contactsReadStream = fs.createReadStream(filePath);

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CsvTransaction[] = [];
    const categories: string[] = [];

    console.log(parseCSV);

    parseCSV.on('data', async line => {      
      const [ title, type, value, category ] = line.map((cell: string) =>
        cell.trim(),
      );

      console.log(title);

      if ( !title || !type || !value ) return;

      categories.push(category);

      transactions.push({title, type, value, category});

    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title : In(categories),
      }
    })

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,     
    );

    const addCategoriesTitles = categories
    .filter(category => !existentCategoriesTitles.includes(category))
    .filter( ( value, index, self) => self.indexOf(value) === index );


    const newCategories = categoriesRepository.create(
      addCategoriesTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map( transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
