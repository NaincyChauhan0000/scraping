const puppeteer = require('puppeteer');
const fastify = require('fastify')();


async function getReviews(bussiness_name) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    let jsonData = [];
    const browser = await puppeteer.launch({ headless: True});
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, devicePixelRatio: 2 });
    await page.goto(`https://www.google.com/search?q=${bussiness_name}`);
    const input = await page.$('.hqzQac');
    await input.click();

    // Scroll Review Model
    await page.waitForSelector('.review-dialog-list');
    const scrollableElement = await page.$('.review-dialog-list');
    let previousHeight = 0;
    let currentHeight = await page.evaluate((element) => {
        return element.scrollHeight;
    }, scrollableElement);

    while (previousHeight !== currentHeight) {
        previousHeight = currentHeight;
        await page.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
        }, scrollableElement);
        await page.waitForTimeout(1000); // Wait for a delay after scrolling
        currentHeight = await page.evaluate((element) => {
            return element.scrollHeight;
        }, scrollableElement);
    }

    // Wait For Scroll
    await new Promise(resolve => setTimeout(resolve, 60 * 500))

    // Scraping Image Data
    await page.waitForSelector('.gws-localreviews__google-review');
    const main_div = await page.$$('.gws-localreviews__google-review');

    const getDesc_ = async (div) => {
        let _desc = await div.$('.Jtu6Td');
        let _desc_ = await _desc.$('span');
        let _desc__ = await _desc_.$('span');
        return _desc__;
    }

    for (const div of main_div) {
        const img = await div.$('img');
        const nameDiv = await div.$('.TSUbDb');
        const _name = await nameDiv.$('a');
        const _ratting = await div.$('.z3HNkc');
        const _time = await div.$('.dehysf');
        let _review_desc = await div.$('.review-full-text');
        _review_desc = _review_desc == null ?  await div.$('.review-snippet') : _review_desc;
        _review_desc = _review_desc == null ?  await getDesc_(div) : _review_desc;
        const src = await page.evaluate(element => element.getAttribute('src'), img);
        const nameData = await page.evaluate(element => element.innerHTML, _name);
        const ratting = await page.evaluate(element => element.getAttribute('aria-label'), _ratting);
        const time = await page.evaluate(element => element.innerHTML, _time);
        const review_desc = _review_desc && await page.evaluate(element => element.innerHTML, _review_desc);
        jsonData.push({
            img : src,
            name : nameData,
            ratting,
            time,
            review_desc,
        } );
    }

    await browser.close();
    console.log("Close");
    console.log(jsonData.length);
    return jsonData;
    

}


fastify.get('/scraped-data/:bussiness_name', async (request, reply) => {
    try {
        const {bussiness_name} = request.params;
        console.log(bussiness_name);

        reviews= await getReviews(bussiness_name);
        

        reply.send(reviews);

        

    } catch (error) {
        reply.status(500).send({ error: 'An error occurred while scraping data' });
    }
});

fastify.listen(3000, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening on ${address}`);
});
