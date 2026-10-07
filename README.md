# Public catalog site

This is a display-only storefront template. It does not access the admin app,
MongoDB, or a private API from the visitor's browser. It has no checkout.

Deploy these files in a **separate repository**, never publish the backoffice
repository as a Pages source. The separate repo initially needs `index.html`,
`style.css`, `app.js`, and `catalog.json` from this folder. Its published files
are public even if the source repository is private.

On the backoffice/database host, after the separate repo has been checked out:

```powershell
python scripts/export_public_catalog.py --output "C:\path\to\separate-shop-repo" --push
```

The exporter reads the private database locally and pushes only `catalog.json`
and re-encoded product images to the separate repo. It does not expose a new
backoffice endpoint. It publishes only in-stock products with valid prices,
and never includes exact quantities, costs, customer records, internal Mongo IDs,
session data, or agent tokens. If the data is unchanged, it makes no commit.

After the first manual run succeeds, schedule that command every few minutes on
the database host. Use a **fine-grained Git credential limited to the public
site repo**; never put an admin or screen-agent token in the public repo, page,
or browser JavaScript. Export errors should alert the operator and leave the
previous `catalog.json` intact. Changes are eventually published after the next
scheduled run, not instantly on save.

There is no way to stop a visitor from copying product names, prices, or images
that the browser can display. Treat everything in the separate repo and its Git
history as public; publish only data that is safe to copy.
