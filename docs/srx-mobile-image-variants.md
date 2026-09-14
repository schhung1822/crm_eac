# Mobile image variants (`*_mb`)

Every managed image now gets a smaller sibling file so mobile and small-slot
layouts stop downloading the full-size asset. The full set of originals in the
SRX database shrank from **11.7 MB to 1.7 MB (-86%)** at these widths.

| Content               | Width | Source column                | Mobile column                   |
| --------------------- | ----- | ---------------------------- | ------------------------------- |
| Product thumbnail     | 480px | `products.thumbnail_url`     | `products.thumbnail_url_mb`     |
| Product info image    | 480px | `products.info_img`          | `products.info_img_mb`          |
| Product gallery       | 480px | `product_images.image_url`   | `product_images.image_url_mb`   |
| Product variant       | 480px | `product_variants.image_url` | `product_variants.image_url_mb` |
| Homepage banner       | 960px | `banners.image_url`          | `banners.image_url_mb`          |
| News article          | 480px | `posts.featured_image_url`   | `posts.featured_image_url_mb`   |
| Ingredient dictionary | 240px | `product_tags.img`           | `product_tags.img_mb`           |

## Naming

The mobile file sits next to the original with a `-mb` suffix, so the path is
derivable but always stored explicitly:

```
/upload/product/abc.webp     ->  /upload/product/abc-mb.webp
/upload/banner/hero.webp     ->  /upload/banner/hero-mb.webp
```

## Reading the columns

A mobile column is `NULL` when no smaller file was produced — the original is
already narrower than the target width, it is an SVG/ICO, or the file is not on
this server. Always fall back to the original:

```sql
SELECT COALESCE(thumbnail_url_mb, thumbnail_url) AS thumbnail FROM products;
```

```html
<img
  src="{{ thumbnail_url }}"
  srcset="{{ thumbnail_url_mb }} 480w, {{ thumbnail_url }} 1200w"
  sizes="(max-width: 640px) 100vw, 480px"
  alt="..."
/>
```

`GET /api/srx/banners/public` already applies the fallback and returns
`image_url_mb` alongside `image_url`.

## When variants are created

- **On upload** — `/api/srx/{banners,news,products,product-tags}/upload` write
  the `-mb` file next to the original and return its URL as `url_mb`.
- **On save** — creating or updating a product, post, banner or ingredient tag
  regenerates the variant from whatever image the record points at and stores
  the path. Picking an existing image from the media library therefore also
  produces a variant, not just a fresh upload.

Generation is skipped when a fresh `-mb` file already exists, so repeated saves
do not re-encode. `src/lib/image-mobile-variant.ts` holds the widths and the
resize logic; `src/lib/srx-mobile-image-columns.ts` adds the columns lazily if
the migration has not been applied yet.

## Media library

`/srx/media-library` lists originals only. A `-mb` file is hidden when its source still
sits next to it in the same folder; an orphaned `-mb` whose source is gone stays listed as a
normal image. Each listed item carries `mobile_url` (empty when no variant exists).

Deleting an image removes its `-mb` sibling too, and renaming or moving one takes the
`-mb` sibling along, so the derived path stays valid. See
`src/lib/srx-media-library-variants.ts`.

## Migration

`sql/20260914_add_mobile_image_columns.sql` adds all seven columns. The app also
creates them on demand, so the file is mainly for a controlled rollout.

## Backfilling existing images

```bash
npm run srx:backfill-mobile-images -- --dry-run   # report only, no resizing
npm run srx:backfill-mobile-images                # generate files + fill columns
npm run srx:backfill-mobile-images -- --force     # re-encode even if -mb exists
npm run srx:backfill-mobile-images -- --only=posts,banners
```

Run it **on the machine that holds `public/upload`**. Rows whose original file is
missing locally are reported as "không có file gốc" and left `NULL`, so running
it from a dev box that is out of sync will simply skip those rows. The command is
idempotent — a second run reports everything as "giữ nguyên".
