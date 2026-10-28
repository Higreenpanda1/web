import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  documentMonths,
  draftItems,
  isPhotoFileName,
  lineTotal,
  orderProducts,
  orderTotal,
  paymentSplit,
  photoFileName,
  productFileName,
} from './product-order.ts'

const REF = 'HGA-20261026-ABC123'

test('a photo entry gives its stored file name', () => {
  assert.equal(
    photoFileName(`${REF}-product1-photos-2.jpg (2.4 MB)`, REF),
    `${REF}-product1-photos-2.jpg`,
  )
  assert.equal(
    photoFileName(
      `${REF}-product1-photos-1.png (12 KB) — not saved on the server, see the email`,
      REF,
    ),
    null,
  )
  assert.equal(photoFileName('HGA-20261026-OTHER1-product1-photos-1.jpg (1 KB)', REF), null)
  assert.equal(photoFileName(42, REF), null)
})

test('only names the form writes are photo names', () => {
  assert.equal(isPhotoFileName(`${REF}-product10-photos-5.webp`, REF), true)
  assert.equal(isPhotoFileName(`${REF}-passportPhoto.jpg`, REF), false)
  assert.equal(isPhotoFileName(`${REF}-product1-photos-1.jpg/../../x`, REF), false)
  assert.equal(isPhotoFileName(`${REF}-product1-photos-1.pdf`, REF), false)
})

test('an Excel or PDF file of a product is read back by the names the form writes', () => {
  assert.equal(
    productFileName(`${REF}-product2-productFiles-1.xlsx (40 KB)`, REF),
    `${REF}-product2-productFiles-1.xlsx`,
  )
  assert.equal(
    productFileName(`${REF}-product2-productFiles-1.pdf (1 MB)`, REF),
    `${REF}-product2-productFiles-1.pdf`,
  )
  assert.equal(productFileName(`${REF}-product1-photos-1.jpg (1 MB)`, REF), null)
  assert.equal(productFileName(`${REF}-product1-productFiles-1.html (1 KB)`, REF), null)
  const [product] = orderProducts(
    {
      products: [
        { productName: 'Mug', productFiles: [`${REF}-product1-productFiles-1.xls (9 KB)`] },
      ],
    },
    REF,
  )
  assert.deepEqual(product?.files, [`${REF}-product1-productFiles-1.xls`])
})

test('products are read from a request with several', () => {
  const products = orderProducts(
    {
      products: [
        {
          productName: 'Ceramic mug',
          quantity: 500,
          unit: 'pieces',
          targetPrice: 1.2,
          priceCurrency: 'usd',
          colours: 'white, black',
          photos: [`${REF}-product1-photos-1.jpg (1 MB)`],
        },
        { productName: 'Gift box', quantity: '200', unit: 'sets' },
      ],
      destinationCountry: 'SA',
    },
    REF,
  )
  assert.equal(products.length, 2)
  assert.equal(products[0]?.photos[0], `${REF}-product1-photos-1.jpg`)
  assert.equal(products[0]?.colours, 'white, black')
  assert.equal(products[1]?.position, 2)
  assert.equal(products[1]?.quantity, 200)
  assert.deepEqual(products[1]?.photos, [])
})

test('a request from before October 2026 reads as one product', () => {
  const products = orderProducts({ productName: 'LED lamp', quantity: 1000 }, REF)
  assert.equal(products.length, 1)
  assert.equal(products[0]?.productName, 'LED lamp')
  assert.deepEqual(orderProducts({ destinationCountry: 'SA' }, REF), [])
  assert.deepEqual(orderProducts(null, REF), [])
})

test('the draft price lines carry what the client asked for, without prices', () => {
  const [line] = draftItems(
    orderProducts(
      { products: [{ productName: 'Mug', quantity: 10, unit: 'kg', sizes: 'S, M' }] },
      REF,
    ),
  )
  assert.deepEqual(line, {
    position: 1,
    productName: 'Mug',
    description: 'Sizes: S, M',
    quantity: 10,
    unit: 'kg',
    unitPrice: null,
  })
})

test('totals need every line priced', () => {
  assert.equal(lineTotal({ quantity: 3, unitPrice: 0.1 }), 0.3)
  assert.equal(orderTotal([{ productName: 'a', quantity: 3, unitPrice: 0.1 }]), 0.3)
  assert.equal(
    orderTotal([
      { productName: 'a', quantity: 500, unitPrice: 1.15 },
      { productName: 'b', quantity: 200, unitPrice: 2.5 },
    ]),
    1075,
  )
  assert.equal(orderTotal([{ productName: 'a', quantity: 3, unitPrice: null }]), null)
  assert.equal(orderTotal([]), null)
})

test('files are looked for in the request month and the month before', () => {
  assert.deepEqual(documentMonths('2026-11-01T00:00:01.000Z'), ['2026-11', '2026-10'])
  assert.deepEqual(documentMonths('2026-01-15T10:00:00.000Z'), ['2026-01', '2025-12'])
  assert.deepEqual(documentMonths('nonsense'), [])
})

test('payment terms split the total into a deposit and a balance, to the cent', () => {
  assert.deepEqual(paymentSplit(8900, 'full'), { share: 1, deposit: 8900, balance: 0 })
  assert.deepEqual(paymentSplit(8900, '50-50'), { share: 0.5, deposit: 4450, balance: 4450 })
  assert.deepEqual(paymentSplit(1234.57, '30-70'), { share: 0.3, deposit: 370.37, balance: 864.2 })
  assert.deepEqual(paymentSplit(100, null), { share: 1, deposit: 100, balance: 0 })
})
