'use strict'

const { Op } = require("sequelize");

const BaseService = require('./baseService');
const UserService = require('./userService');

const { Transaction, User } = require('../database/index');



class transactionService extends BaseService {
    constructor() {
        super(Transaction);
        this.userServ = new UserService();
        this.baseServ = new BaseService(User);
    }

    async deposit(userId, id, amount) {
        const { results: user } = await this.userServ.userOne(userId, id);
        const newBalance = user.balance + amount;
        await this.userServ.userUpdate(userId, id, { balance: newBalance });
        const depositData = {
            amount: amount,
            userId: userId,
            userBetId: "Deposit",
            category: "Deposit",
            status: "Deposit",
        }
        const newDeposit = await Transaction.create(depositData);
        return {
            id: newDeposit.id,
            status: "200",
            amount: newDeposit.amount,
            message: `Se ha depositado $ ${amount} a la cuenta del usuario ${user.firstName} ${user.lastName}`,
            message: `$ ${amount} has been deposited to the account of the user ${user.firstName} ${user.lastName}`,
        }
    }


    async withdraw(userId, id, amount) {
        const { results: user } = await this.userServ.userOne(userId, id);

        if (user.balance < amount) return { message: ` El usuario  " ${user.username} "  Nombre completo " ${user.firstName} ${user.lastName} " no tiene suficiente dinero en su cuenta` };

        const newBalance = user.balance - amount;

        await this.userServ.userUpdate(userId, id, { balance: newBalance });

        const withdrawData = {
            amount: amount,
            userId: userId,
            userBetId: "Withdraw",
            category: "Withdraw",
            status: "Withdraw",
        }

        const newWithdraw = await Transaction.create(withdrawData);
        return {
            id: newWithdraw.id,
            status: "200",
            amount: newWithdraw.amount,
            message: `Se ha retirado $ ${amount} de la cuenta del usuario ${user.firstName} ${user.lastName}`,
        }

    }



    async getBalanceUser(userId, id) {
        const { results: user } = await this.userServ.userOne(userId, id);
        const balance = await this.#balance(id);
        return {
            userId: id,
            balance: balance.balance,
            message: `The current balance of user ${user.firstName} ${user.lastName} is $ ${balance.balance}`,
        }
    }


    //Amin
    async getTransactionsByAmin(idUser, id, category, username, userId) {
        const { results: user } = await this.userServ.userOne(idUser, id);

        const whereClause = {
            category: category || { [Op.ne]: null },
            userId: userId || { [Op.ne]: null },
        };

        if (userId) {
            whereClause.userId = userId;
        }

        if (username) {
            const user = await User.findOne({ where: { username } });
            whereClause.userId = user.id;
        }


        const transactions = await Transaction.findAll({
            where: whereClause,
        });


        const formattedTransactions = [];
        for (const transaction of transactions) {
            const user = await User.findOne({ where: { id: transaction.userId } });
            const formattedTransaction = {
                id: transaction.id,
                amount: transaction.amount,
                userBetId: transaction.userBetId,
                category: transaction.category,
                status: transaction.status,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
                userId: user,
            };
            formattedTransactions.push(formattedTransaction);
        }

        return {
            count: formattedTransactions.length,
            transactions: formattedTransactions,
        };
    }

    //User
    async getTransactionsByUser(idUser, id, category, userId) {

        const { results: user } = await this.userServ.userOne(idUser, id);

        const whereClause = {
            category: category || { [Op.ne]: null },
            userId: idUser
        };

        const transactions = await Transaction.findAll({
            where: whereClause
        });

        const formattedTransactions = [];

        for (const transaction of transactions) {
            const user = await this.userServ.userOne(idUser, transaction.userId);
            const formattedTransaction = {
                id: transaction.id,
                amount: transaction.amount,
                userBetId: transaction.userBetId,
                category: transaction.category,
                status: transaction.status,
                createdAt: transaction.createdAt,
                updatedAt: transaction.updatedAt,
                userId: user,
            };
            formattedTransactions.push(formattedTransaction);
            console.log(formattedTransactions);
        }

        return {
            count: formattedTransactions.length,
            transactions: formattedTransactions,
        }
    }


    //solicitar saldo de un usuario poe username
    async getBalanceUserAdmin(userId, idUser, username) {
        const { results: user } = await this.userServ.userOne(userId, idUser);

        const { entities: userBalance } = await this.baseServ.findAllByField('username', username)
        if (!userBalance) throw new Error(`The user ${username} does not exist`);

        const balance = await this.#balance(userBalance[0].id);


        return {
            username: userBalance[0].username,
            firstName: userBalance[0].firstName,
            lastName: userBalance[0].lastName,
            balance: balance.balance,
            message: `The current balance of user ${userBalance[0].firstName} ${userBalance[0].lastName} is $ ${balance.balance}`,
        }


    }


    //consultar saldo de un usuario por id
    async #balance(id) {
        const deposit = await Transaction.sum('amount', { where: { userId: id, category: 'Deposit' } });   // suma de los depositos 
        const withdraw = await Transaction.sum('amount', { where: { userId: id, category: 'Withdraw' } }); // suma de los retiros
        const bet = await Transaction.sum('amount', { where: { userId: id, category: 'Bet' } });            // suma de las apuestas
        const winning = await Transaction.sum('amount', { where: { userId: id, category: 'Winning' } });    // suma de las ganancias
        const balance = (deposit + winning) - (withdraw + bet); // balance actual del usuario 

        return {
            userId: id,
            balance: balance,
            // message: `The current balance of user ${user.firstName} ${user.lastName} is $ ${balance}`,
        }
    }
}

module.exports = transactionService;


