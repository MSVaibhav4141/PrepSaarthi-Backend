const Chat = require("../models/chatModel");
const Notification = require("../models/notificationModel.js");
const Message = require("../models/messageModel");
const Connection = require("../models/connectionModel.js");
const errorCatcherAsync = require("../utils/errorCatcherAsync");
const Mentor = require("../models/mentorModel");
const Student = require("../models/studentModel.js");
const sendMail = require("../utils/sendMail.js");

const mongoose = require("mongoose");

const wordToNumber = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
};

const letterToNumber = {
  'A': '1', 'B': '2', 'C': '3', 'D': '4', 'E': '5', 'F': '6', 'G': '7', 'H': '8', 'I': '9', 'J': '0',
};

const numberPattern = /\b(?:\d{10}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/;

const keywordsPattern = /\b(text|call|ping|message|number|contact|reach)\b/gi;

const replaceWordNumbers = (message) => {
  return message.split(' ').map(word => wordToNumber[word.toLowerCase()] || word).join(' ');
};

const replaceLetterNumbers = (message) => {
  return message.split('').map(char => letterToNumber[char.toUpperCase()] || char).join('');
};

const detectPhoneNumber = (message) => {
  let convertedMessage = replaceWordNumbers(message);

  convertedMessage = replaceLetterNumbers(convertedMessage);

  return numberPattern.test(convertedMessage);
};

const detectNumberSharing = (message) => {
  const hasKeyword = keywordsPattern.test(message);

  const hasPhoneNumber = detectPhoneNumber(message);

  if ((hasKeyword && hasPhoneNumber) || hasPhoneNumber) {
      return true
  } else {
      return false;
  }
};


exports.chatService = errorCatcherAsync(
  async ({io, socket, openedChat, connectedUsers, onlineUsers}, res, next ) => {
    
    socket.on('senddd',(temp) => {
      console.log(temp,'daad')
    })
    socket.on('temp-chat',(temp) => {
      socket.emit('hide-footer',temp)
    })
    socket.on('main-s',(userId) => {
      onlineUsers.set(userId, socket.id)
    })
    socket.on('handle-typing', ({isTyping, reciverID, userId}) => {
      if(connectedUsers.has(reciverID)){
        const reciver = connectedUsers.get(reciverID)
        if(reciver){
          io.to(reciver).emit('set-typing',({isTyping, userId}))
        }
      }
    })

    socket.on("status", async(userId) => {
      const messages =  await Message.find({reciverId:userId, delivered:false})
      const idsToUpdate = messages.map(doc => (doc._id).toString());
      const idsToSend = [...new Set(messages.map(doc => (doc.senderId).toString()))];
      const isUpdated = await Message.updateMany(
        { _id: { $in: idsToUpdate } }, // Match documents by their IDs
        { $set: { delivered: true, deliveredAt:new Date() } }  // Update multiple fields
      );
      const onlineUsers = idsToSend
      .filter(i => connectedUsers.has(i.toString())) // Filter the valid user IDs
      .map(i => connectedUsers.get(i.toString()));

 
      if(onlineUsers.length > 0){
      io.to(onlineUsers).emit('message-delivered', idsToUpdate)
      }
      connectedUsers.set(userId, socket.id);
      socket.broadcast.emit("mystatus", { userId, status: "online" });
    });

    socket.on("getonlineusers", (users) => {
      const onlineUsers = users.filter((item) => connectedUsers.has(item));
      socket.emit("onlineusers", onlineUsers);
    }); 

    socket.on("join-chat", async ({ loged, userId, role }) => {
      // const {id,role} = req.user;
      let messages = await Message.find({seen:false, reciverId:loged})
      const idsToUpdate = messages.map(doc => ({
        _id: doc._id,
        seenAt: new Date(), 
      }));
            const idsToSend = [...new Set(messages.map(doc => (doc.senderId).toString()))];
            const bulkOps = idsToUpdate.map(item => ({
              updateOne: {
                filter: { _id: item._id },
                update: { $set: { seen: true, seenAt: item.seenAt } },
              },
            }));
            

            const result = await Message.bulkWrite(bulkOps);
            const onlineUsers = idsToSend
      .filter(i => connectedUsers.has(i.toString())) // Filter the valid user IDs
      .map(i => connectedUsers.get(i.toString()));
      if(onlineUsers.length > 0){
        io.to(onlineUsers).emit('message-seen', idsToUpdate)
        }
      openedChat.set(loged, userId);
      let chat = await Chat.findOne({
        mentorId: role === "mentor" ? loged : userId,
        studentId: role === "student" ? loged : userId,
      });
      if (!chat) {
        // chat = new Chat({ studentId:role === 'student'?loged:userId, mentorId:role === 'mentor'?loged:userId });

        // await chat.save();
        socket.emit("chat-retrival", { message: [], chatId: null });
      } else {
        await Notification.updateOne({ chatId: chat._id, unseenFor: loged },{$set:{chatUnread:0, notificationUnseen:0}});
        await Notification.deleteMany({chatUnread:0, notificationUnseen:0,unseenFor:loged})
        socket.emit("chat-retrival", {
          message: await Message.find({ chatId: chat._id }).sort({
            timeStamp: 1,
          }),
          chatId: chat._id.toString(),
        });
      }

      // socket.join(chat._id.toString());
    });

    socket.on(
      "send-message",
      async ({ senderId, content, userId, role }) => {
        if(content.length === 0){
          socket.emit('errors',({errorType:'noMessage',message:'No user found', }))

        }
        // const chat = await Chat.findById(chatId);
        if(detectNumberSharing(content)){
          if(role === 'mentor'){
            const mentor = await Mentor.findByIdAndUpdate(senderId, {$set:{mentoringStatus:'inactive'}})
            const student = await Student.findById(userId)
const toAdmin = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
    <div style="background-color: #FF6F61; padding: 20px; border-radius: 10px; text-align: center;">
        <h2 style="color: #fff; margin: 0;">Account Suspension Notification</h2>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
        <p style="font-size: 1.1em;">
            Dear Admin,
        </p>
        <p style="font-size: 1.1em;">
            We would like to inform you about a recent incident involving the suspension of user accounts due to a violation of our privacy policies. The details of the incident are as follows:
        </p>
        <p style="font-size: 1.1em;">
            <strong>Incident Details:</strong><br>
            <strong>Users Involved:</strong> ${mentor.name}, ${student.name} <br>
            <strong>Date and Time:</strong> ${(new Date()).toLocaleString('en-GB', {day: '2-digit',month: '2-digit',year: 'numeric',hour: '2-digit',minute: '2-digit',hour12: true,})}<br>
            <strong>Reason:</strong> Sharing of personal phone numbers within the platform.
        </p>
  
        <p style="font-size: 1.1em;">
            Thank you for your attention to this matter.
        </p>
        <p>Best regards,<br>
       
            <span style="color: #FF6F61;">Team PrepSaarthi</span><br>
        </p>
    </div>
</div>
`
            const suspension = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
    <div style="background-color: #3A5AFF; padding: 20px; border-radius: 10px; text-align: center;">
        <h2 style="color: #fff; margin: 0;">Account Suspension Notice</h2>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
        <p style="font-size: 1.1em;">
            Dear ${mentor.name},
        </p>
        <p style="font-size: 1.1em;">
            We hope this message finds you well.
        </p>
        <p style="font-size: 1.1em;">
            We regret to inform you that your account has been suspended due to a violation of our privacy policies, specifically related to the sharing of personal phone numbers within our platform. As outlined in our Privacy Policy and Terms of Service, sharing personal contact information is strictly prohibited to ensure integrity of platform.
        </p>
        <p style="font-size: 1.1em;">
            We understand that this may come as a surprise, and if you believe this suspension was made in error, we encourage you to reach out to us. Please reply to this email or contact our support team at <a href="mailto:team@prepsaarthi.com" style="color: #3A5AFF;">team@prepsaarthi.com</a> with any relevant details, and we will review your case thoroughly.
        </p>
        <p style="font-size: 1.1em;">
            Your understanding and cooperation in maintaining the integrity of our community are greatly appreciated.
        </p>
        <p style="font-size: 1.1em;">
            Thank you for your attention to this matter.
        </p>
        <p>Best regards,<br>

            <span style="color: #3A5AFF;">Team PrepSaarthi</span><br>
        </p>
    </div>
</div>
`     
await sendMail({
  email: mentor.email,
  subject: `Account suspension notice`,
  message: suspension,
});
await sendMail({
  email: process.env.PRCTRMAIL,
  subject: `Account suspension notice`,
  message: toAdmin,
});

            // await Mentor.findByIdAndUpdate(senderId, {$set:{mentoringStatus:'inactive', isApproved:'no', isPending:'yes'}})
          }
          if(role === 'student'){
           const student =  await Student.findByIdAndUpdate(senderId, {$set:{isActive:false}})
           const mentor = await Mentor.findById(userId)

           const toAdmin = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
    <div style="background-color: #FF6F61; padding: 20px; border-radius: 10px; text-align: center;">
        <h2 style="color: #fff; margin: 0;">Account Suspension Notification</h2>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
        <p style="font-size: 1.1em;">
            Dear Admin,
        </p>
        <p style="font-size: 1.1em;">
            We would like to inform you about a recent incident involving the suspension of user accounts due to a violation of our privacy policies. The details of the incident are as follows:
        </p>
        <p style="font-size: 1.1em;">
            <strong>Incident Details:</strong><br>
            <strong>Users Involved:</strong> ${mentor.name}, ${student.name} <br>
            <strong>Date and Time:</strong> ${(new Date()).toLocaleString('en-GB', {day: '2-digit',month: '2-digit',year: 'numeric',hour: '2-digit',minute: '2-digit',hour12: true,})}<br>
            <strong>Reason:</strong> Sharing of personal phone numbers within the platform.
        </p>
  
        <p style="font-size: 1.1em;">
            Thank you for your attention to this matter.
        </p>
        <p>Best regards,<br>
       
            <span style="color: #FF6F61;">Team PrepSaarthi</span><br>
        </p>
    </div>
</div>
`
           
            const suspension = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
            <div style="background-color: #3A5AFF; padding: 20px; border-radius: 10px; text-align: center;">
                <h2 style="color: #fff; margin: 0;">Account Suspension Notice</h2>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
                <p style="font-size: 1.1em;">
                    Dear ${student.name},
                </p>
                <p style="font-size: 1.1em;">
                    We hope this message finds you well.
                </p>
                <p style="font-size: 1.1em;">
                    We regret to inform you that your account has been suspended due to a violation of our privacy policies, specifically related to the sharing of personal phone numbers within our platform. As outlined in our Privacy Policy and Terms of Service, sharing personal contact information is strictly prohibited to ensure integrity of platform.
                </p>
                <p style="font-size: 1.1em;">
                    We understand that this may come as a surprise, and if you believe this suspension was made in error, we encourage you to reach out to us. Please reply to this email or contact our support team at <a href="mailto:team@prepsaarthi.com" style="color: #3A5AFF;">team@prepsaarthi.com</a> with any relevant details, and we will review your case thoroughly.
                </p>
                <p style="font-size: 1.1em;">
                    Your understanding and cooperation in maintaining the integrity of our community are greatly appreciated.
                </p>
                <p style="font-size: 1.1em;">
                    Thank you for your attention to this matter.
                </p>
                <p>Best regards,<br>
        
                    <span style="color: #3A5AFF;">Team PrepSaarthi</span><br>
                </p>
            </div>
        </div>
        `     
        await sendMail({
          email: student.email,
          subject: `Account suspension notice`,
          message: suspension,
        });
        await sendMail({
          email:process.env.PRCTRMAIL,
          subject: `Account suspension notice`,
          message: toAdmin,
        });
          }

          socket.emit('errors',({errorType:'restrictedContent',message:'Sharing Numbers Are Stricty Prohibited'}))

          return;
        }
        let userExists = false;
        if (role === "mentor") {
          userExists = await Student.findById(userId);
        }
        if (role === "student") {
          userExists = await Mentor.findById(userId);
        }
        if (!userExists) {
          // return next(new ErrorHandler("Not allowed", 403))
          socket.emit('errors',({errorType:'nouserFound',message:'No user found', }))
          return;
        }
        // const messageObject = {
        //     senderId:req.user.id,
        //     content,
        //     chatId
        // }
        let chat = await Chat.findOne({
          $or: [
            { mentorId: senderId, studentId: userId },
            { mentorId: userId, studentId: senderId },
          ],
        });
        const senderDetails = await Student.findById(senderId) || await Mentor.findById(senderId) ;

        if (!chat) {
          if(content.length > 500){
            socket.emit('errors',({errorType:'message-limit',message:'You must buy the mentorship to continue chatting', }))
            return;
          }
          chat = new Chat({
            studentId: role === "student" ? senderId : userId,
            mentorId: role === "mentor" ? senderId : userId,
          });
          await chat.save();
          const message = new Message({
            chatId: chat._id,
            senderId,
            content,
            reciverId: userId,
            timeStamp:new Date()
          });
          await message.save();
          chat.chatLeft = chat.chatLeft - content.length;
          await chat.save()
          let newMessage = {
            name: senderDetails.name,
            avatar: senderDetails.avatar.public_URI,
            id: senderDetails._id,
            status: "online",
            message: message.content,
            senderId: message.senderId,
            time: message.timeStamp,
            chatId: message.chatId,
            reciverId:userId,
            isHighlighted: true,
            unreadChat: 1,
            unseenFor:userId
          };
          const reciverId = connectedUsers.get(userId);
          const isOnline = onlineUsers.get(userId);
          try {
            let notificationUser = await Notification.findOne({
              chatId: chat._id,
            });

            if (notificationUser) {
              notificationUser.chatUnread = notificationUser.chatUnread + 1;
              notificationUser.notificationUnseen = reciverId ? 0 : 1;
              notificationUser.unseenFor = userId;
              notificationUser.senderName = senderDetails.name,
              notificationUser.senderContent = message.content,
              notificationUser.senderId = senderId,
              notificationUser.senderAvatar = userExists.avatar.public_URI
              await notificationUser.save();
            } else {
               notificationUser = new Notification({
                chatId: chat._id,
                chatUnread: 1,
                notificationUnseen: reciverId ? 0 : 1,
                senderName:senderDetails.name,
                senderContent:message.content,
                senderId:senderId,
                senderAvatar:senderDetails.avatar.public_URI,
                unseenFor: userId,
              });
              await notificationUser.save();
            }
            if(!reciverId && isOnline){
              const online = onlineUsers.get(userId)
              io.to(online).emit('send-not', ({notificationUser}))
            }
          } catch (e) {
            console.log(e);
          }
          if (reciverId) {
            message.delivered = true;
            message.deliveredAt = new Date();
            if(openedChat.get(userId) === senderId){
              message.seen = true;
              message.deliveredAt = new Date();
            }
            await message.save();
            io.to(reciverId).emit("recive-message", {
              message: newMessage,
              age: "new",
            });
          }
          socket.emit("recive-message", {message,name:userExists.name, avatar:userExists.avatar,status:reciverId ? 'online':'offline' ,age: "old", chatLeft:chat.chatLeft});
        } else {
          if(role === 'student'){
            const isSubscribed = await Connection.findOne({studentDetails:senderId, mentorDetails:userId, isActive:true})
            if(!isSubscribed){
              if(chat.chatLeft < content.length){
                socket.emit('errors',({errorType:'message-limit',message:'You must buy the mentorship to continue', }))
                return;
            }
            }
          }
          if(role === 'mentor'){
            const isSubscribed = await Connection.findOne({studentDetails:userId, mentorDetails:senderId, isActive:true})
            if(!isSubscribed){
              if(chat.chatLeft <= 0){
                socket.emit('errors',({errorType:'message-limit',message:'You currently dont have active connection with this mentee', }))
                return;
            }
            }
          }
        
          const message = new Message({
            chatId: chat._id,
            senderId,
            content,
            reciverId: userId,
          });
          await message.save();
          chat.chatLeft = chat.chatLeft - content.length;
          await chat.save()
          // const room = io.sockets.adapter.rooms.get(chatId);
          // const numberOfUsers = room ? room.size : 0;
          // console.log(numberOfUsers)
          // await Message.create(messageObject)
          const reciverId = connectedUsers.get(userId);
          const isOnline = onlineUsers.get(userId);
          const isOpenChat = openedChat.get(userId) === senderId;
          if(!isOpenChat){
          try {
            let notificationUser = await Notification.findOne({
              chatId: chat._id,
            });

            if (notificationUser) {
              
              notificationUser.chatUnread = notificationUser.chatUnread + 1;
              notificationUser.notificationUnseen = reciverId ? 0 : 1
              notificationUser.unseenFor = senderId;
              notificationUser.senderName = senderDetails.name,
              notificationUser.senderContent = message.content,
              notificationUser.senderAvatar = senderDetails.avatar.public_URI,
              notificationUser.senderId = userExists._id,
              await notificationUser.save();
            } else {
              notificationUser = new Notification({
                chatId: chat._id,
                chatUnread: 1,
                notificationUnseen: reciverId ? 0 : 1,
                senderName:senderDetails.name,
                senderAvatar:senderDetails.avatar.public_URI,
                senderContent:message.content,
                senderId:senderId,
                unseenFor: userId,
              });
              await notificationUser.save();
            }
            if(!reciverId && isOnline){
              const online = onlineUsers.get(userId)
              io.to(online).emit('send-not', ({notificationUser}))
            }
          } catch (e) {
            console.log(e);
          }}
          if (reciverId) {
            message.delivered = true;
            message.deliveredAt = new Date();
            if(isOpenChat){
              message.seen = true;
              message.seenAt = new Date();
            }
            await message.save();

            io.to(reciverId).emit("recive-message", {
              message: { ...message._doc, isHighlighted:isOpenChat ? false : true },
              age: "old",
            });
          }
          socket.emit("recive-message", { message, age: "old",chatLeft:chat.chatLeft });
        }
      }
    );
    socket.on("disconnect", () => {
      try {
        for (let [loged, socketsId] of onlineUsers.entries()) {
          if (socket.id === socketsId) {
            onlineUsers.delete(loged);
            // io.emit("mystatus", { userId: loged, status: "offline" });
            console.log(`${loged} deleted`);
            break;
          }
        }
        for (let [loged, socketsId] of connectedUsers.entries()) {
          if (socket.id === socketsId) {
            connectedUsers.delete(loged);
            openedChat.delete(loged);
            io.emit("mystatus", { userId: loged, status: "offline" });
            console.log(`${loged} deleted`);
            break;
          }
        }
      } catch (e) {
      }
    });
  }
);
exports.retriveChat = errorCatcherAsync(async (req, res, next) => {
  // const chats = await Chat.find({
  //     $or:[
  //         {mentorId:req.user.id},
  //         {studentId:req.user.id}
  //     ]
  // })

  const chats = await Message.aggregate([
    {
      $match: {
        $or: [
          { senderId: new mongoose.Types.ObjectId(req.user.id) },
          { reciverId: new mongoose.Types.ObjectId(req.user.id) },
        ],
      },
    },
    {
      $sort: { timeStamp: -1 },
    },
    {
      $group: {
        _id: "$chatId",
        mostRecentMessage: { $first: "$$ROOT" },
      },
    },
    {
      $lookup: {
        from: "chats", // Chat collection to join with
        localField: "_id", // chatId from the grouped result
        foreignField: "_id", // _id in the Chat collection
        as: "chatDetails", // Alias for the joined Chat details
      },
    },
    {
      $unwind: "$chatDetails", // Unwind to get a single object from the array
    },
    {
      $lookup: {
        from: "students", // Assuming you have a students collection
        localField: "chatDetails.studentId", // Link studentId from the chatDetails
        foreignField: "_id", // _id in the Student collection
        as: "studentDetails", // Alias for the joined student details
      },
    },
    {
      $lookup: {
        from: "mentors", // Assuming you have a mentors collection
        localField: "chatDetails.mentorId", // Link mentorId from the chatDetails
        foreignField: "_id", // _id in the Mentor collection
        as: "mentorDetails", // Alias for the joined mentor details
      },
    },
    {
      $lookup: {
        from: "notifications", // Join with the Notification collection
        localField: "_id", // Use chatId from the grouped result
        foreignField: "chatId", // Match with chatId in Notification
        as: "notification", // Alias for the notification details
      },
    },
    {
      $project: {
        _id: 1,
        mostRecentMessage: 1,
        "chatDetails.studentId": 1,
        "chatDetails.mentorId": 1,
        "chatDetails.chatLeft": 1,
        studentDetails: {
          id: { $arrayElemAt: ["$studentDetails._id", 0] },
          name: { $arrayElemAt: ["$studentDetails.name", 0] },
          avatar: { $arrayElemAt: ["$studentDetails.avatar", 0] },
        },
        mentorDetails: {
          id: { $arrayElemAt: ["$mentorDetails._id", 0] },
          name: { $arrayElemAt: ["$mentorDetails.name", 0] },
          avatar: { $arrayElemAt: ["$mentorDetails.avatar", 0] },
        },
        notification: { $arrayElemAt: ["$notification", 0] }, // Get the first notification (if exists)
        unreadCount: {
          $ifNull: [{ $arrayElemAt: ["$notification.chatUnread", 0] }, 0],
        }, // Add chatUnread from notification
        isHighlighted: {
          $cond: [
            { $gt: [{ $arrayElemAt: ["$notification.chatUnread", 0] }, 0] },
            true,
            false,
          ],
        }, // Flag for highlighting if unread messages exist
      },
    },
    {
      $sort: {
        isHighlighted: -1, // Sort so that highlighted chats (with unread messages) appear first
        "mostRecentMessage.timeStamp": -1, // Then sort by most recent message timestamp
      },
    },
  ]);

  res.status(200).json({
    chats,
    success: true,
  });
});
// module.exports = chatService

exports.notificationFetch = errorCatcherAsync(
  async(req, res, next) => {
    await Notification.deleteMany({chatUnread:0, notificationUnseen:0, unseenFor:req.body.id})
    const notification = await Notification.find({unseenFor:req.body.id,  notificationUnseen: { $gt: 0 }})
    res.status(200).json({
      notification,
      success: true,
    });
  }
)
exports.notificationDelete = errorCatcherAsync(
  async(req, res, next) => {
    await Notification.deleteMany({_id:req.body.id})
    const notification = await Notification.find({unseenFor:req.body.id,  notificationUnseen: { $gt: 0 }})
    res.status(200).json({
      notification,
      success: true,
    });
  }
)