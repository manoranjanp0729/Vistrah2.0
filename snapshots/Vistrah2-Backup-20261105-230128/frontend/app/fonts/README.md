# Local font assets

Downloaded 9 October 2026 from the official source repositories. The original
SIL Open Font License files are included beside the fonts. These binaries are
bundled by `next/font/local`; neither a build nor a visitor requires a remote
font service.

| Asset | Source | SHA-256 |
| --- | --- | --- |
| InterVariable.woff2 | [Inter v4.1](https://raw.githubusercontent.com/rsms/inter/v4.1/docs/font-files/InterVariable.woff2) | `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3` |
| InterVariable-Italic.woff2 | [Inter v4.1 italic](https://raw.githubusercontent.com/rsms/inter/v4.1/docs/font-files/InterVariable-Italic.woff2) | `e564f652916db6c139570fefb9524a77c4d48f30c92928de9db19b6b5c7a262a` |
| DMSerifDisplay-Regular.ttf | [Google Fonts source](https://raw.githubusercontent.com/google/fonts/main/ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf) | `8cc3643535edf039aa5d95440a8542735e9197e4f4b8d9303e980fefbf5ab616` |
| DMSerifDisplay-Italic.ttf | [Google Fonts italic source](https://raw.githubusercontent.com/google/fonts/main/ofl/dmserifdisplay/DMSerifDisplay-Italic.ttf) | `df74c0ac387baeaeb0fe4f2324e1668e6a3ed8c09cd9796fe162c71753e19e45` |

Inter supports real variable weights 100–900 with normal and italic faces;
the UI uses 400, 500, 600 and 700. DM Serif Display has only weight 400,
in normal and italic styles. Do not apply semibold or bold to editorial type.

Only normal Inter is preloaded globally. Other faces are requested when used.
The full font character sets are retained for names, international listings,
punctuation and currency symbols. No font subsetting or binary modification
was performed. Approximate sizes: Inter 344 KiB normal / 379 KiB italic;
DM Serif Display 75 KiB normal / 70 KiB italic.
