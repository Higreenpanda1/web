'use client'

import { useConfig, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React from 'react'

import { orderProducts } from '@/lib/product-order'

/**
 * A product request as the team reads it: each product with its photos and
 * answers, and the two printable briefs — the full one for the office, and
 * one without the client's details or prices that can go to a factory as
 * it is. The raw answers stay in "Details" below.
 */
export function ProductOrder() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const details = useFormFields(([fields]) => fields.details?.value)
  const reference = useFormFields(([fields]) => fields.reference?.value)

  if (!id || typeof reference !== 'string') return null
  const products = orderProducts(details, reference)
  const base = `${config.routes.api}/applications/${id}`
  const photo = (file: string) => `${base}/photo/${encodeURIComponent(file)}`

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <a
          className="btn btn--style-primary btn--size-medium"
          href={`${base}/brief`}
          target="_blank"
          rel="noopener"
        >
          Print brief for the team
        </a>
        <a
          className="btn btn--style-secondary btn--size-medium"
          href={`${base}/brief?for=factory`}
          target="_blank"
          rel="noopener"
        >
          Print brief for the factory
        </a>
      </div>

      {products.length === 0 && <p>No products in this request.</p>}
      {products.map((product) => (
        <div
          key={product.position}
          style={{
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <h4 style={{ margin: '0 0 0.75rem' }}>
            {product.position}. {product.productName}
          </h4>
          {product.photos.length > 0 ? (
            <div
              style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}
            >
              {product.photos.map((file) => (
                <a key={file} href={photo(file)} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-only files */}
                  <img
                    src={photo(file)}
                    alt=""
                    style={{
                      height: '120px',
                      width: 'auto',
                      maxWidth: '200px',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      border: '1px solid var(--theme-elevation-150)',
                    }}
                  />
                </a>
              ))}
            </div>
          ) : (
            <p style={{ margin: '0 0 0.75rem', color: 'var(--theme-elevation-500)' }}>No photos.</p>
          )}
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'max-content 1fr',
              gap: '0.25rem 1rem',
              margin: 0,
            }}
          >
            {(
              [
                [
                  'Quantity',
                  product.quantity !== null ? `${product.quantity} ${product.unit ?? ''}` : null,
                ],
                [
                  'Target price',
                  product.targetPrice !== null
                    ? `${product.targetPrice} ${(product.priceCurrency ?? '').toUpperCase()}`
                    : null,
                ],
                ['Sizes', product.sizes],
                ['Colours', product.colours],
                ['Details', product.specs],
              ] as const
            )
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <React.Fragment key={label}>
                  <dt style={{ fontWeight: 600 }}>{label}</dt>
                  <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{value}</dd>
                </React.Fragment>
              ))}
            {product.productLink && (
              <>
                <dt style={{ fontWeight: 600 }}>Link</dt>
                <dd style={{ margin: 0, wordBreak: 'break-all' }}>
                  <a href={product.productLink} target="_blank" rel="noopener noreferrer">
                    {product.productLink}
                  </a>
                </dd>
              </>
            )}
          </dl>
        </div>
      ))}
    </div>
  )
}
