import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto('http://localhost:8000')

        # Wait for the initial content to be ready
        await page.wait_for_selector('#cotizaciones .card')

        # Fill out the form
        await page.fill('.descripcion-input', 'Diseño de logo')
        await page.fill('.cantidad-input', '1')
        await page.fill('.precio-input', '1000')

        # Apply a 50% down payment
        await page.check('#aplicarAnticipo')
        await page.wait_for_selector('#anticipoSection', state='visible')
        await page.select_option('#tipoAnticipo', 'porcentaje')
        await page.fill('#valorAnticipo', '50')

        # Verify the preview updates correctly
        await expect(page.locator('#previewTotal')).to_have_text('$1160.00')
        await expect(page.locator('#previewAnticipo')).to_have_text('$580.00')
        await expect(page.locator('#previewSaldo')).to_have_text('$580.00')

        # Take a screenshot for visual confirmation
        await page.screenshot(path='jules-scratch/verification/anticipo_feature.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())