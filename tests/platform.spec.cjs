// Run with NODE_PATH set to a Playwright installation and the app on BASE_URL.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.BASE_URL||'http://127.0.0.1:8000';
 await page.goto(base);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('littlemind-bruce-local-chat-v1',JSON.stringify([{role:'user',content:'旧对话'}]));});await page.reload();
 await page.getByRole('heading',{name:'在世界的间隙，'}).count();
 assert.equal(await page.locator('.card').count(),3);
 await page.screenshot({path:(process.env.SCREENSHOT_DIR||'/tmp')+'/interspace-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'随便遇见一个'}).click();assert(await page.locator('dialog').isVisible());await page.locator('dialog a').click();assert(page.url().includes('/character/'));assert(!(await page.locator('dialog').isVisible()));
 await page.goto(base+'/#/explore');await page.getByLabel('搜索角色').fill('Bruce');assert.equal(await page.locator('.card').count(),1);
 await page.getByRole('button',{name:'收藏 Bruce',exact:true}).click();assert.equal(await page.getByLabel('搜索角色').inputValue(),'Bruce');
 await page.goto(base+'/#/mine?tab=favorites');assert.equal(await page.locator('.card').count(),1);
 await page.goto(base+'/#/explore');await page.getByLabel('搜索角色').fill('不存在');assert(await page.getByText('还没有遇到匹配的角色').isVisible());
 await page.goto(base+'/#/studio');await page.getByLabel('角色名字').fill('测试 <img src=x onerror=alert(1)>');await page.getByLabel('身份与一句话介绍').fill('私人草稿');await page.getByLabel('第一句开场').fill('你好');await page.getByRole('button',{name:'保存私有草稿'}).click();assert.equal(await page.locator('#draft-preview img').count(),0);await page.reload();assert.equal(await page.getByLabel('身份与一句话介绍').inputValue(),'私人草稿');
 await page.goto(base+'/#/mine?tab=drafts');assert(await page.getByRole('heading',{name:'测试 <img src=x onerror=alert(1)>'}).isVisible());
 await page.getByLabel('收起接待员').click();await page.reload();assert(await page.locator('#guide-restore').isVisible());await page.locator('#guide-restore').click();await page.locator('#guide-toggle').click();assert(await page.getByText('预设引导 · 暂未接入 AI').isVisible());
 await page.goto(base+'/#/account');const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出备份'}).click();assert.equal((await download).suggestedFilename(),'interspace-backup.json');
 // Model stream mocked: no paid provider call, verifies unchanged browser/API contract.
 await page.route('**/api/v1/session',r=>r.fulfill({json:{access_required:false,authenticated:true}}));
 await page.route('**/api/v1/chat',async r=>{const data=r.request().postDataJSON();assert.equal(data.messages.at(-1).content,'测试回复');await r.fulfill({contentType:'text/event-stream',body:'data: {"text":"测试成功"}\n\ndata: [DONE]\n\n'});});
 await page.goto(base+'/static/bruce.html');assert(await page.locator('#messages').getByText('旧对话',{exact:true}).isVisible());await page.getByLabel('输入消息').fill('测试回复');await page.getByRole('button',{name:'发送消息',exact:true}).click();await page.getByText('测试成功',{exact:true}).waitFor();
 await page.getByLabel('输入消息').fill('记住：我喜欢茶');await page.getByRole('button',{name:'发送消息',exact:true}).click();await page.locator('#memory-button').click();assert(await page.getByText('我喜欢茶',{exact:true}).isVisible());
 const isolated=await browser.newContext();const second=await isolated.newPage();await second.goto(base+'/#/mine?tab=favorites');assert(await second.getByText('还没有收藏的角色').isVisible());await isolated.close();
 await page.setViewportSize({width:390,height:844});
 for(const route of ['/home','/explore','/character/bruce','/mine','/studio','/account','/space/bruce','/unknown']){await page.goto(base+'/#'+route);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow: ${route}`);}
 await page.goto(base+'/#/home');await page.screenshot({path:(process.env.SCREENSHOT_DIR||'/tmp')+'/interspace-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: routes, search, favorites, encounter, draft persistence/XSS, guide, export, isolated storage, chat stream fixture, memory, mobile overflow');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
