import { timingSafeEqual } from "node:crypto";
import admin from "firebase-admin";

function initialize() {
  if (admin.apps.length) return admin.app();
  const projectId=process.env.FIREBASE_PROJECT_ID;
  const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n");
  const databaseURL=process.env.FIREBASE_DATABASE_URL;
  if(!projectId||!clientEmail||!privateKey||!databaseURL)throw new Error("Firebase Admin environment is incomplete");
  return admin.initializeApp({credential:admin.credential.cert({projectId,clientEmail,privateKey}),databaseURL});
}
function authorize(req){
  const expected=process.env.BRINGO_NOTIFICATION_SEND_CODE;
  const provided=/^Bearer (.+)$/.exec(req.headers.authorization||"")?.[1];
  if(!expected||!provided)return false;
  const a=Buffer.from(provided),b=Buffer.from(expected);
  return a.length===b.length&&timingSafeEqual(a,b);
}
function tokensOf(user){
  return [...new Set([user?.fcmToken,...(Array.isArray(user?.fcmTokens)?user.fcmTokens:Object.values(user?.fcmTokens||{}))].filter(v=>typeof v==="string"&&v.length>30))];
}
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    initialize();
    if(!authorize(req))return res.status(403).json({error:"كود إرسال الإشعارات غير صحيح. حاول مرة أخرى."});
    const {userId,title,body}=req.body||{};
    if(typeof title!=="string"||typeof body!=="string"||!title.trim()||!body.trim()||title.length>80||body.length>300)return res.status(400).json({error:"Invalid notification content"});
    const broadcast=req.url?.includes("send-notification-all");
    if(!broadcast&&(!userId||typeof userId!=="string"))return res.status(400).json({error:"userId required"});
    const snapshot=await admin.database().ref(broadcast?"users":`users/${userId}`).get();
    const users=broadcast?Object.entries(snapshot.val()||{}):[[userId,snapshot.val()||{}]];
    const recipients=users.flatMap(([id,user])=>tokensOf(user).map(token=>({id,token})));
    if(!recipients.length)return res.status(200).json({ok:false,successCount:0,failureCount:0,deviceCount:0,usersWithTokens:0,registeredCustomers:users.length,errors:[{code:"NO_TOKENS",message:"No customer FCM tokens found"}]});
    const notificationRef=admin.database().ref("notifications").push();
    await notificationRef.set({userId:broadcast?"all":userId,title:title.trim(),body:body.trim(),createdAt:admin.database.ServerValue.TIMESTAMP,isRead:false,source:"admin"});
    let successCount=0,failureCount=0;const errors=[];
    for(let offset=0;offset<recipients.length;offset+=500){
      const batch=recipients.slice(offset,offset+500);
      const response=await admin.messaging().sendEachForMulticast({tokens:batch.map(x=>x.token),notification:{title:title.trim(),body:body.trim()},data:{source:"admin",notificationId:notificationRef.key},android:{priority:"high",notification:{channelId:"bringo_notifications"}}});
      successCount+=response.successCount;failureCount+=response.failureCount;
      response.responses.forEach((r,i)=>{if(!r.success&&errors.length<5)errors.push({code:r.error?.code||"FCM_ERROR",message:r.error?.message||"Unknown FCM error"});});
    }
    return res.status(200).json({ok:successCount>0,successCount,failureCount,deviceCount:recipients.length,usersWithTokens:new Set(recipients.map(x=>x.id)).size,registeredCustomers:users.length,notificationId:notificationRef.key,errors});
  }catch(e){console.error("Notification send failed",e);return res.status(500).json({error:"Notification service unavailable. Check Firebase Admin configuration and server logs."});}
}
