import { Context, Schema, Random, $} from 'koishi'

export const name = 'yuc-market'

export const inject = ['database']

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export interface UserData{
  id: string
  eyes: number
  lastChickIn: string
}

export interface Product{
  id: number
  name: string
  qq: string
  price: number
  type: string
  publicPrice: number
  description: string
  isAvaliable: number
}

export const menuContent = `
1. bot简介
2. 签到
3. 查看眼
4. 转帐(格式：转帐：@群友名 眼数)
5. 商店使用指南
6. 色图
7. 商品列表1
`;

export const purchaseGuideContent = `
1.购买货物的格式为“购买：商品序号”，如（购买：1.1）（标点符号均为中文符号）
2.想要上架新商品，您需要向店长提供：商品名称（必填），出售人qq（必填，可以选择是否展示），商品描述（选填）。
3.如需跨群购买请暂时通过店长操作（相关功能正在尝试开发）。
4.如果购买了人类商品，请在服务结束后告知机器人重新上架，格式为“上架：商品序号”
`

export const botGuideContent = `
1.本bot由阿尔卡纳的机器人(37)为原型机开发，旨在为rp/语c的各种店铺提供方便的交易平台。
2.由于开发环境完全不同，原bot数据继承难度较大，因此直接摆了。
3.本机器人为试运行版本。如有bug和问题请联系开发者。
4.本商店仅供rp娱乐，不得用于非法用途和任何真实商业用途，否则后果自负。
`
declare module 'koishi' {
  interface Tables {
    userdata: UserData
    product: Product
  }
}
export async function apply(ctx: Context) {
  await extendDatabase(ctx)
  ctx.command('菜单')
  .action(async () => {
    return `${menuContent}`
  })//菜单
  ctx.command('bot简介')
  .action(async () => {
    return `${botGuideContent}`
  })//bot简介
  ctx.command('商店使用指南')
  .action(async () => {
    return `${purchaseGuideContent}`
  })//商店使用指南

  ctx.middleware(async (session, next) => {//签到
    if(session.content === '签到') {
      return await handleCheckIn(ctx, session);
    }
    else{
      return next();
    }
  })
  ctx.middleware(async (session, next) => {//查询眼数
    if(session.content === '查看眼') {
      return await handleEyeCount(ctx, session);
    }
    else{
      return next();
    }
  })
  ctx.middleware(async (session, next) => {//转账
    //转账格式“转账：@好友 眼数”
    const message = session.content
    const command = message.split('：')[0]
    if(command === '转账') {
      return await handleTransfer(ctx, session);
    }
    else{
      return next();
    }
  })
  ctx.middleware(async (session, next) => {//购买
    //购买格式“购买：商品id（价格类型）”
    const message = session.content
    const command = message.split('：')[0]
    if(command === '购买') {
      return await handlePurchase(ctx, session);
    }
    else{
      return next();
    }
  })
  ctx.middleware(async (session, next) => {//清除数据
    if(session.content === '清除数据') {
      const [data] = await ctx.database.get('userdata', {id: session.userId})
      if(data){
        await ctx.database.remove('userdata', {id: session.userId})
        return '数据已清除'
      }
      else{
        return '没有数据'
      }
    }
    else{
      return next();
    }
  })
  ctx.middleware(async (session, next) => {//商品列表
    const message = session.content
    const command = message.split('表')[0] + '表'
    const listNumber = parseInt(message.split('表')[1])
    if(command === '商品列表') {
      return await handleListProduct(ctx, session, listNumber);
    }
    else{
      return next();
    }
  })
  ctx.middleware(async (session, next) => {//添加商品
    const message = session.content
    const command = message.split('：')[0]
    if(command === '上新') {
      return await handleNewProduct(ctx, session);
    }
    else{
      return next();
    }
  })
  ctx.middleware(async (session, next) => {//删除商品
    const message = session.content
    const command = message.split('：')[0]
    if(command === '删除') {
      return await handleRemoveProduct(ctx, session);
    }
    else{
      return next();
    }
  })
  ctx.middleware(async (session, next) => {//上架商品
    const message = session.content
    const command = message.split('：')[0]
    if(command === '上架') {
      return await handleChangeAvaliable(ctx, session);
    }
    else{
      return next();
    }
  })
  ctx.middleware(async (session, next) => {//开发者增加眼数
    if(session.content === '增加眼数') {
      await handleDevIncreaseEyes(ctx, session);
      return '增加成功'
    }
    else{
      return next();
    }
  })
  ctx.middleware(async (session, next) => {//开发者导入数据
    const message = session.content
    const command = message.split('：')
    if(command[0] === '导入数据3763432724') {
      return await handleDevImportData(ctx, session, command[1]);
    }
    else{
      return next();
    }
  })
}


async function extendDatabase(ctx: Context) {
  await ctx.model.extend('userdata', {
    id:'string',
    eyes: 'integer',
    lastChickIn: 'string'
  }, {
    primary: 'id'
  })
  await ctx.model.extend('product', {
    id: 'float',
    name: 'string',
    qq: 'string',
    price: 'integer',
    type: 'string',
    publicPrice: 'unsigned',
    description: 'string',
    isAvaliable: 'integer'
  }, {
    primary: 'id'
  })
}//扩展数据库
async function handleCheckIn(ctx, session: any) {
  const today = new Date().toISOString().split('T')[0]
  const [data] = await ctx.database.get('userdata',{id: session.userId} )
  if (data && data.lastChickIn === today) {
    return '你今天已经签到过了'
  } else {
    const randomEyes = Random.int(5, 11)
    const newData = {
      eyes: (data ? data.eyes : 0) + randomEyes,
      lastChickIn: today
    }
    try {
      await ctx.database.upsert('userdata', (row) => [
        { id: session.userId, eyes: newData.eyes, lastChickIn: today }
      ] )
      return `用户 ${session.userId} 已签到，已获得${randomEyes}眼，当前共有 ${newData.eyes} 眼`
    } catch (error) {
      return '签到失败：稍后再试'
    }
  }
}//签到
async function handleEyeCount(ctx, session: any) {
  const [data] = await ctx.database.get('userdata', {id: session.userId})
  return `您有${data ? data.eyes : 0}眼`
}//查询眼数
async function handleTransfer(ctx, session: any){
  const content = session.content
  const regex = /[1-9][0-9]{5,11}/g
  const matches = content.match(regex)//截取qq号
  if (!matches || matches.length < 1) {
    return
  }

  const targetUserId = matches[0]//目标用户qq号
  const eyesString = content.split(' ')[2]//截取眼数
  const eyes = parseInt(eyesString)//转换为数字
  if (isNaN(eyes) || eyes <= 0) {
    return'眼数必须是一个正整数'
  }
  const successMessage = `已成功转账${eyes}眼给${targetUserId}`;
  const errorMessage = '转账失败，稍后再试';
  await handleTransaction(ctx, session, targetUserId, eyes, '转账', successMessage, errorMessage);
} //转账

async function handlePurchase(ctx, session: any) {
  const content = session.content
  const regex = /：(.*?)(（(.*?)）|$)/ //读取：和（中间的内容(商品id)，读取括号内的内容(价格类型)
  const matches = content.match(regex)

  const id = parseFloat(matches ? matches[1] : '')
  if (!id) {
    return
  }
  const [product] = await ctx.database.get('product', {id: id})
  if (!product) {
    return '商品不存在'
  }
 
  let price = product.price
  if (product.type === 'slave') {
    const priceType = matches[3]
    if (priceType === '公演') {
      if(product.publicPrice === -1){
        return '该商品不参与公演'
      }
      else{
        price = product.publicPrice
      }

    }
  }

  const targetID = product.qq
  const successMessage = `已成功购买${product.name}， 花费${price}眼`
  const errorMessage = '购买失败，稍后再试'
  const transactionSuccess = await handleTransaction(ctx, session, targetID, price, '购买', successMessage, errorMessage)
  if (transactionSuccess) {
    product.isAvaliable = 0;
    await ctx.database.set('product', id, {isAvaliable: 0})
  }  

}//购买

async function handleTransaction(ctx, session, targetUserId, targeteyes, transactionType, successMessage, errorMessage) {
  if(targetUserId === session.userId){
    session.send(`${transactionType}失败，这是你自己`)
    return false
  }
  const [sourceData] = await ctx.database.get('userdata', {id: session.userId})

  if (!sourceData || sourceData.eyes < targeteyes) {
    if (!sourceData) {
      await ctx.database.create('userdata', {id: session.userId, eyes: 0, lastChickIn: ''})
    }
    session.send('你的眼数不够')
    return false
  }
  console.log('断点1');
   let targetData = await ctx.database.get('userdata', {id: targetUserId})
  if (!targetData) {
    targetData = await ctx.database.create('userdata', {id: targetUserId, eyes: 0, lastChickIn: ' '})
  }
  console.log('断点2');
  const newSourceData = {
    eyes: sourceData.eyes - targeteyes,
    lastChickIn: sourceData.lastChickIn,
  } 
  const newTargetData = {
    eyes: targetData.eyes + targeteyes,
    lastChickIn: targetData.lastChickIn,
  }

  try {
    await ctx.database.upsert('userdata', (row) => [
      { id: session.userId, eyes: newSourceData.eyes, lastChickIn: newSourceData.lastChickIn },
      { id: targetUserId, eyes: newTargetData.eyes, lastChickIn: newTargetData.lastChickIn }
    ])
    session.send(successMessage + `，剩余${sourceData.eyes - targeteyes}眼`)
    return true
  } catch (error) {
    session.send(errorMessage)
    console.error(`${transactionType}失败:`, error)
    return false
  }
}//处理交易

async function handleListProduct(ctx, session: any, listNumber: number) {
  if (!listNumber) {
    return
  }
  const products =await ctx.database
                          .select('product')
                          .orderBy('id', 'asc')
                          .where(row => $.gte(row.id, listNumber))
                          .where(row => $.lt(row.id, listNumber + 1))
                          .execute()
  if (!products || products.length === 0) {
    return '该列表暂无商品'
  }
  let productList = ''
  console.log(products[0].isAvaliable);
  for (const product of products) {
    productList += `${product.id.toFixed(1)} ${product.name}(${product.description}) ${product.price}眼 ${product.publicPrice === -1 ? '（无公演）' : `（公演${product.publicPrice}眼）`} ${product.isAvaliable === 1 ? `出售中` : `营业中`} \n`
  }
  return productList

}//商品列表

async function handleNewProduct(ctx, session: any) {
  const content = session.content
  const productInformation = content.split(' ')
  const newProduct = {
    id: parseFloat(productInformation[1]),
    name: productInformation[2],
    qq: productInformation[3],
    type: productInformation[4],
    price: parseInt(productInformation[5]),
    publicPrice: parseInt(productInformation[6]),
    description: productInformation[7],
    isAvaliable: 1
  }
  await ctx.database.create('product', newProduct)

  return `${newProduct.name}已上架`
}//添加商品

async function handleRemoveProduct(ctx, session: any) {
  const content = session.content
  const productInformation = content.split('：')
  const id = parseFloat(productInformation[1])
  await ctx.database.remove('product', {id: id})
  return `商品${id.toFixed(1)}已下架`
}//删除商品

async function handleChangeAvaliable(ctx, session: any) {
  const content = session.content
  const id = content.split('：')[1]
  if (!id) {
    return
  }
  const [product] = await ctx.database.get('product', {id: id}, ['isAvaliable'])
  if (!product) {
    return '商品不存在'
  }
  product.isAvaliable = 1
  await ctx.database.set('product', id, {isAvaliable: 1})
  return `商品${id}已上架`
}//上架商品

async function handleDevIncreaseEyes(ctx: Context, session: any) {
  await ctx.database.set('userdata', '3763432724', (row) => ({eyes: $.add(row.eyes, 100)}))
}//获取眼数

async function handleDevImportData(ctx: Context, session: any, allData: any) {
  const data = allData.split(/\r?\n/);
  for (const row of data) {
    const [userId, eyes, lastChickIn] = row.split(' ')
    await ctx.database.upsert('userdata', (row) => [
      { id: userId, eyes: parseInt(eyes), lastChickIn: lastChickIn }
    ])
  }
  return '导入完成'
}//导入数据