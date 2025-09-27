# Westminster Astronomical Society Website

This repository contains the source for the Westminster Astronomical Society
website, which is temporarily hosted at
[east20thst.net](https://east20thst.net). It is built using
[Hugo](https://gohugo.io/), a popular static site generator, and uses the
[Bootstrap 5](https://getbootstrap.com/docs/5.3/getting-started/introduction/)
framework for styling and layout.

To contribute, please fork the repository and clone it to your local machine.

## Content Authoring

The front page is composed of dynamic sections configured via YAML files in the
`data/` directory. You can enable/disable sections and edit their content there.
It is fairly self-explanatory. The front page is rendered using the
`layouts/index.html` template.

Other site content, top-level pages and sections are in the `content/`
directory. Each section (e.g. `events`, `observations`, `page`, `people`,
`post`) has its own folder and an `_index.md` file (note the underscore, this is
a branch) to render the section landing page, and each page or post within a
section is a markdown file with front matter metadata. 

Pages can also be organized into sub-folders with an `index.md` file (no
underscore, this is a leaf) and the images or other assets for the page. You can
use resources in `/assets` or `/static` but it is easier to keep them within the
page bundle.

Sections and pages are rendered using the corresponding templates in `layouts/`
or the default `list.html` / `single.html` in the theme layouts if a custom
template does not exist.

There are content archetypes in the `archetypes/` directory to provide default
front matter when creating new content. If you have hugo installed, you can use
`hugo new <section>/<name>.md` to create a new page or post with the appropriate
front matter. otherwise, you can just copy an existing file and modify it.

Front matter fields are in yaml format, delimited by `---` at the top and
bottom. 

Example post front matter:
```yaml
---
title: "Observing Challenge - August 2025"
description : "This month's challenges can be found throughout the northern, eastern, and southern parts of the sky."
date: 2025-07-25
draft: false
images: ["observing-challenge-2025-08-01.png"]
categories: ["Observing Challenge"]
tags: ["Double Stars"]
authors: ["paul-moos"]
---
```

The front matter will vary depending on the content type. See some examples in
the `content/` directory. The `images` field is for a thumbnail, `categories`
and `tags` are for organizing content. 

Posts have `authors`, events have `organizers`, and `speakers`, observations
have `observers`. These will link to the corresponding profiles in
`content/people/`.

Draft content will not be published until `draft` is set to false, post-dated
content will not be published until the date is reached so for events that are
in the future you can set a `date` and a `publishDate` to control when it
appears on the site.

All content is written in markdown. You can use standard markdown syntax for
headings, lists, links, images, tables, etc. It is a very simple markup language.
If you are not familiar with it, a good reference is
[Markdown Guide](https://www.markdownguide.org/).

There is a limited ability to format some elements with class attributes for
styling. For example, to add a margin to the bottom of an image and make it
responsive, you could do this:

```markdown
![Alt text](image.jpg){ .img-fluid .mb-3 }
```

There are also some shortcodes available in `layouts/shortcodes/` that can be used
to add buttons, person links, video embeds, etc. For example, to add a button:

```markdown
{{< button href="https://example.com" title="Click Me" />}}
```
An example of it's use is on the outreach page.

To add a person link with an avatar:

```markdown
{{< person name="John Doe" >}}
```
The outreach page has an example of this shortcode for the outreach coordinator.

For a you-tube video embed:

```markdown
{{< youtube id="VIDEO_ID" >}}
```
The August 2025 meeting post has an example of this shortcode.



## Structure and Layout

The above sections cover the basics of authoring content for the site and you
can probably stop reading here. Below is an overview of the repository to help
contributors understand where things live and how Hugo assembles the site.

    ├── archetypes/        # Front‑matter templates for new content types
    ├── assets/            # Hugo Pipes pipeline sources (SCSS, unprocessed images, JS)
    ├── config/_default/   # Hugo configuration files (config, menus, params, etc.)
    ├── content/           # Markdown content organized by section (about, events, posts, etc.)
    ├── data/              # Data and config for front page dynamic partials (carousel, features, etc.)
    ├── i18n/              # Translation files (if/when multilingual support is expanded)
    ├── layouts/           # Layouts, partials and shortcodes overriding / extending the theme layouts
    ├── public/            # Generated output (DO NOT EDIT — produced by `hugo`)
    ├── resources/         # Hugo cache / processed assets (`_gen` output for pipes & images)
    ├── static/            # Static files served verbatim (images, bundled css/js not processed by Pipes)
    ├── themes/cassiopeia/ # Files for layout and structure of the site (mirror of the root structure)
    └── README.md          # This file

## Key Directories in More Detail

### archetypes/

Contains starter front matter for different content types (e.g. `post.md`, `people.md`, `page.md`). Running `hugo new post/my-article.md` will use these defaults.

### assets/ vs static/

- `assets/` files are processed by Hugo Pipes (fingerprinted, minified, transformed). Compiles SCSS, and processes images needing resizing.
- `static/` files are copied as-is. Used for favicons, third‑party scripts, or pre-built/minified assets you don't want altered.


### config/_default/

The site configuration broken into into:

- `config.toml` core site settings (baseURL, languageCode, title, taxonomies, outputs)
- `languages.toml` multilingual settings (there's only English but could be extended for translations)
- `markup.toml` Markdown/render settings (Goldmark, highlight, etc.)
- `params.toml` custom theme/site parameters (consumed in layouts & partials)
- `menus/` directory for navigation menu definitions.


### content/

Top-level pages and primary site sections:

`about.md`, `outreach.md`, `observatory.md`, `planetarium.md`, etc. for standalone pages.

- `events/` for meetings, talks, and outreach event listings
- `observations/` for observation reports
- `page/` for featured articles, guides etc
- `people/` authors, speakers, event organizers etc.
- `post/` for regular blog posts and monthly challenges etc.

- Section index files named `_index.md` control list/landing pages (e.g. `events/_index.md`).
- People, observations, and posts each reside in their own sub-folders for organization and per‑item pages.

### data/

Structured YAML for the front page sections (carousel slides, feature panels,
masthead content, etc.). Front page sections can be enable/disabled and their content
edited here. They are loaded with `site.Data` in the templates.


### layouts/

- `index.html` custom home page layout, overrides the defaults in `themes/cassiopeia/layouts/_default/`.

- Section templates: `events/`, `observations/`, `people/`, `post/`, override the defaults in `themes/cassiopeia/layouts/_default/`.

- Front page partials:
  - Off canvas pop-ups for join, donate etc. (`offcanvas.html`)
  - Front page sections (`carousel-masthead.html`, `cover.html`, `extra-footer.html`, `latest-posts.html`, `masthead.html`, `monthly-meeting.html`, `features.html`, `featured-pages.html`)
- Shared partials:
  - share links for posts (`share-links.html`)
  - author, speaker, organizer list for posts (`person-names.html`).
  - Shortcodes in `shortcodes/` provide inline content helpers (`button`, `person`).

### public/

The rendered site. Only present after a build. (in `.gitignore`).

### resources/_gen/

Auto-generated by Hugo for processed assets (in `.gitignore`).

### Theme structure (`themes/cassiopeia/`)

Provides Bootstrap 5 integration and base styling. Custom templates in `layouts/` of the root directory take precedence.

### assets/

- `/themes/cassiopeia/assets/js` - Bootstrap and theme js.
  - `bootstrap/bootstrap.bundle.js` is the bootstrap that is used.
  - `color-modes.js` handles light/dark mode switching.
  - `main.js` is where custom JS can be added. There is some js in there for transparent navbar handling.
  
- `/themes/cassiopeia/assets/sass` - Bootstrap and theme scss.
  - `bootstrap/` - Bootstrap SCSS source files.
  - `variable-overrides.scss` - colormap to override bootstrap variables before compilation.
  - `custom.scss` - additional custom styles for the theme.
  - `styles.scss` - site styles.
  - `main.scss` - main entrypoint that imports the above.

### static/

- `/static/icons` - icons and logos for the site.
  - `site-logos.svg` - logos for the site.
  - `site-icons.svg` - icons for the site (folder, tag, etc.).
  - `social-icons.svg` - social media icons (twitter, facebook, etc.).
  - `astro-icons.svg` - astronomy related icons.

### layouts/

- `/themes/cassiopeia/layouts/_default` - default layouts for the theme.
  - `baseof.html` - base layout for all pages that other templates extend.
  - `list.html` - default list layout for sections.
  - `single.html` - default single page layout.

- `/themes/cassiopeia/layouts/partials` - headers, footers, and other shared components that extend `baseof.html`.
  - `head/head.html` - HTML head section with meta tags and links. includes:
    - `content-security-policy.html` - CSP meta tag.
    - `style-sheet.html` - CSS links (Bootstrap, theme styles).
    - `seo.html` - meta tags for search engine optimization.
    - `favicons.html` - favicon links.

  - `footer/footer.html` - site footer.
  - `footer/script-footer.html` - JS scripts included at the end of the body.

## Building the Site

To run a local development server for the site, run the following command in the
root of the repository:
```bash
hugo server
```

Run `hugo`  to build the site, (optionally with `--minify`, this will minify the
HTML output as well as the css and js). The output will be in the `public/` directory.

## Deployment

There are a number of ways to deploy the site. `rsync` is probably the most
straightforward for syncing the `public/` directory to a remote server. The
included `deploy.sh` is a simple script that builds the site and uses `rsync` to
push the files. It can be adapted for your hosting environment.


## Further Reading

The official Hugo docs at <https://gohugo.io/documentation/> and Bootstrap 5
docs at <https://getbootstrap.com/docs/5.3/getting-started/introduction/> are
probably useful.

