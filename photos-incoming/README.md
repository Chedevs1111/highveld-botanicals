# Drop product photography here

Name each file after the product handle, with an optional shot kind:

    durban-poison.jpg          hero  — front-on, used on cards and as the PDP lead
    durban-poison-macro.jpg    macro — trichomes in focus
    durban-poison-scale.jpg    scale — in a hand or beside a coin
    durban-poison-label.jpg    label — packaging with the batch code legible

Handles:

    durban-poison
    swazi-gold
    malawi-cobra
    midnight-kush
    cape-haze-pre-roll-5-pack
    citrus-sunrise-gummies
    dark-cacao-bar
    blue-dream-live-resin-cart
    full-spectrum-cbd-oil-1000mg
    recovery-balm

Then run:

    node scripts/ingest-photos.mjs

Requirements: JPEG or PNG, at least 1200px on the short edge. Anything
non-square is centre-cropped, so leave headroom around the subject.
