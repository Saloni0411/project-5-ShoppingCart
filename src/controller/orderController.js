const orderModel = require('../model/orderModel')
const userModel = require("../model/userModel")
const productModel = require("../model/productModel")
const validator = require("../validator/validation")
const cartModel = require('../model/cartModel')

/******************************** Create Order ***************************/

const createOrder = async function(req,res) {
    try{
        const body = req.body
        if (Object.keys(body) == 0) {
            return res.status(400).send({status: false,message: "please provide data"})
        }

         const userId = req.params.userId;
        if(!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid parameters"});
        }
        console.log(req.userId, "checking userId")
        if(userId !== req.userId) {
            return res.status(401).send({status: false, message: "Unauthorised access"})
        }
         const findUserCart = await cartModel.findOne({userId})
         console.log(findUserCart)
         if(findUserCart._id.toString() != body.cartId){
            return res.status(404).send({status: false, message: "user's cart does not exist"})
         }
        

        const {cartId, cancellable, status, isDeleted} = body

        if(!validator.isValid(cartId)) {
            return res.status(400).send({status: false, message: "cartId must be present"})
        }

        if(!validator.isValidObjectId(cartId)) {
            return res.status(400).send({status: false, message: "Invalid cartId"})
        }

        if(isDeleted == true) {
            return res.status(400).send({status: false, message: "Bad request"})
        }

        const userSearch = await userModel.findOne({_id: userId})
        if(!userSearch) {
            return res.status(400).send({status: false, message: "User does not exist"})
        }

        const cartSearch = await cartModel.findOne({userId: req.params.userId}).select({items:1, totalPrice:1, totalItems:1, userId:1})
        if(!cartSearch) {
            return res.status(404).send({status: false, message: "User cart not found"})
        }
        console.log(cartSearch.userId, "this")
        if(cartSearch.userId != req.userId) {
            return res.status(400).send({status:false, message: "Unauthorised access u need to enter your userId"})
        }

        if (cancellable) {
            if (!(typeof (cancellable) == 'boolean')) {
                return res.status(400).send({ status: false, message: "Cancellable must be a boolean value" });
            }
        }

        if(status) {
            if (['pending', 'completed', 'cancelled'].indexOf(status) == -1) {
                return res.status(400).send({status: false, message: "Order status by default is pending"})
            }
        }

        let totalQuantity = 0

        let itemsArr = cartSearch.items
        for (let i in itemsArr) {
            totalQuantity += itemsArr[i].quantity
        }
        let order = { userId: userId, items: cartSearch.items, totalPrice: cartSearch.totalPrice, totalItems: cartSearch.totalItems, totalQuantity: totalQuantity, cancellable, status}

        let createdOrder = await orderModel.create(order)

        await cartModel.findOneAndUpdate({userId:userId}, {items:[], totalItems:0, totalPrice:0}, {new: true})
        return res.status(201).send({status: true, message: "Success", data: createdOrder})
        
        
    }
    catch (error) {
        res.status(500).send({ message: "Error", error: error.message })
    }
}

/******************************** Update Order **********************************/

const updateOrder =async function(req,res) {
    try{

        const body = req.body

        if (Object.keys(body) == 0) {
            return res.status(400).send({status: false,message: "please provide data"})
        }
        
        const userId = req.params.userId;
        if(!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid parameters"});
        }

        const userSearch = await userModel.findById({_id:userId})
        if(!userSearch) {
            return res.status(400).send({status: false, message: "userId does not exist"})
        }

        if(userId !== req.userId) {
            return res.status(401).send({status: false, message: "Unauthorised access"})
        }

        const {orderId,status} = body

        if(!validator.isValid(orderId)) {
            return res.status(400).send({status: false, message: "orderId is required"})
        }

        if(!validator.isValidObjectId(orderId)) {
            return res.status(400).send({status: false, message: "Invalid orderId"})
        }

        if(!validator.isValid(status)) {
            return res.status(400).send({status: false, message: "status is required"})
        }

        if(['pending','completed','cancelled'].indexOf(status) == -1) {
            return res.status(400).send({status: false, message: "status will be in `pending,completed,cancelled`"})
        }

        const orderSearch = await orderModel.findOne({_id: orderId})
        if(!orderSearch) {
            return res.status(400).send({status: false, message: "order does not exist"})
        }

        if(orderSearch.isDeleted == true) {
            return res.status(400).send({status: false, message: "order is already deleted"})
        }

        const userSearchInOrder = await orderModel.findOne({userId:userId})
        if(!userSearchInOrder) {
            return res.status(400).send({status: false, message: "user does not exist"})
        }

        if(orderSearch.cancellable == false) {
            return res.status(400).send({status: false, message: "Order is not cancellable"})
        }

        if((orderSearch.status) == "completed") {
            return res.status(400).send({status: false, message: "Order is already completed, so it can't be updated"})
        } 

        if((orderSearch.status) == "cancelled") {
            return res.status(400).send({status: false, message: "Order is cancelled, so it can't be updated"})
        }

        if (orderSearch.cancellable == true  && orderSearch.status == 'pending') {
            let updatedData = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: { status:status} }, { new: true })
            return res.status(200).send({ status: true, message: "Success", data: updatedData });
        }
    }
    catch (error) {
        res.status(500).send({ message: "Error", error: error.message })
    }
}

module.exports = { createOrder,updateOrder }