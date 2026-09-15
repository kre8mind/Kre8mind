const fs = require('fs');
const path = require('path');

// 1. Update index.html
let html = fs.readFileSync('index.html', 'utf8');

// Favicons
const oldFavicon = `  <!-- Favicon -->
  <link rel="icon" type="image/jpeg" href="/assets/FAVICON.jpg">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/assets/FAVICON.jpg">`;

const newFavicon = `  <!-- Favicon (Google SERP & Retina Display Compliant) -->
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48.png">
  <link rel="icon" type="image/png" sizes="96x96" href="/assets/favicon-96.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon-192.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
  <link rel="shortcut icon" href="/favicon.ico">`;

if (html.includes(oldFavicon)) {
  html = html.replace(oldFavicon, newFavicon);
  console.log('Updated Favicon tags in index.html');
}

// Schema.org Sitelinks & WebSite
const oldWebSiteSchema = `      {
        "@type": "WebSite",
        "@id": "https://kre8mind.com/#website",
        "url": "https://kre8mind.com/",
        "name": "Kre8mind",
        "description": "Clarity by Design — Product Redesign, UX/UI Architecture, and Scalable Web Design Studio.",
        "publisher": {
          "@id": "https://kre8mind.com/#organization"
        },
        "inLanguage": "en"
      },`;

const newWebSiteSchema = `      {
        "@type": "WebSite",
        "@id": "https://kre8mind.com/#website",
        "url": "https://kre8mind.com/",
        "name": "Kre8mind",
        "alternateName": ["Kre8mind Studio", "kre8mind", "kree8mind", "kre8"],
        "description": "Clarity by Design — Product Redesign, UX/UI Architecture, and Scalable Web Design Studio.",
        "publisher": {
          "@id": "https://kre8mind.com/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://kre8mind.com/projects?search={search_term_string}",
          "query-input": "required name=search_term_string"
        },
        "inLanguage": "en"
      },
      {
        "@type": "ItemList",
        "@id": "https://kre8mind.com/#sitelinks-navigation",
        "name": "Kre8mind Primary Sitelinks Navigation",
        "itemListElement": [
          {
            "@type": "SiteNavigationElement",
            "position": 1,
            "name": "Services",
            "description": "Comprehensive UX/UI design, product redesign, SaaS interface architecture, and Figma design systems.",
            "url": "https://kre8mind.com/services"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 2,
            "name": "Selected Projects",
            "description": "Curated case studies of FinTech, SaaS, AI, PropTech, and digital product redesigns.",
            "url": "https://kre8mind.com/projects"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 3,
            "name": "Pricing & Retainers",
            "description": "Transparent pricing for design sprints, full product redesigns, and dedicated studio retainers.",
            "url": "https://kre8mind.com/#pricing"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 4,
            "name": "Journal & Perspectives",
            "description": "Strategic insights and design perspectives on user psychology, interface clarity, and design systems.",
            "url": "https://kre8mind.com/journal"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 5,
            "name": "How We Work",
            "description": "Our 4-step clarity design sprint framework: Deconstruct, Architect, Refine, and Scale.",
            "url": "https://kre8mind.com/#how-we-work"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 6,
            "name": "Book a Discovery Call",
            "description": "Schedule a direct introductory call with the Kre8mind design team to discuss your project.",
            "url": "https://cal.com/kre8mind/project-discovery"
          }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://kre8mind.com/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://kre8mind.com/"
          }
        ]
      },`;

if (html.includes(oldWebSiteSchema)) {
  html = html.replace(oldWebSiteSchema, newWebSiteSchema);
  console.log('Added SiteNavigationElement & Sitelinks schema in index.html');
}

// Scroll progress bar right below <body>
if (!html.includes('id="scrollProgressBar"')) {
  html = html.replace('<body>', '<body>\n\n  <!-- Luxury Hairline Scroll Progress Bar -->\n  <div class="scroll-progress-bar" id="scrollProgressBar" aria-hidden="true"></div>');
  console.log('Injected scrollProgressBar below <body> in index.html');
}

// Lucide script defer
html = html.replace('<script src="https://unpkg.com/lucide@latest"></script>', '<script defer src="https://unpkg.com/lucide@latest"></script>');

// Update Hero show images
for (let i = 1; i <= 5; i++) {
  html = html.replace(
    new RegExp(`src="assets/showcase/hERO%20SHOW/${i}\\.jpg"`, 'g'),
    `src="assets/showcase/hERO SHOW/${i}.webp" decoding="async"`
  );
  html = html.replace(
    new RegExp(`src="assets/showcase/hERO SHOW/${i}\\.jpg"`, 'g'),
    `src="assets/showcase/hERO SHOW/${i}.webp" decoding="async"`
  );
}

// Update HWCH
html = html.replace('src="assets/showcase/HWCH/clarity-1.png"', 'src="assets/showcase/HWCH/clarity-1.webp" loading="lazy" decoding="async"');
html = html.replace('src="assets/showcase/HWCH/how we help 2.png"', 'src="assets/showcase/HWCH/how we help 2.webp" loading="lazy" decoding="async"');
html = html.replace('src="assets/showcase/HWCH/3.png"', 'src="assets/showcase/HWCH/3.webp" loading="lazy" decoding="async"');

// Update Showcase cards
html = html.replace('src="assets/showcase/ave_cover_1788514443500.jpg"', 'src="assets/showcase/ave_cover_1788514443500.webp" loading="lazy" decoding="async"');
html = html.replace('src="assets/showcase/mockup-1.jpg"', 'src="assets/showcase/mockup-1.webp" loading="lazy" decoding="async"');
html = html.replace('src="assets/showcase/mockup-2.jpg"', 'src="assets/showcase/mockup-2.webp" loading="lazy" decoding="async"');
html = html.replace('src="assets/showcase/mockup-3.jpg"', 'src="assets/showcase/mockup-3.webp" loading="lazy" decoding="async"');

// Update Before & Afters
const beforeAfters = [
  ['AVENO%20BEFORE.jpg', 'AVENO BEFORE.webp'],
  ['AVENO BEFORE.jpg', 'AVENO BEFORE.webp'],
  ['AVENOR%20AFTER.jpg', 'AVENOR AFTER.webp'],
  ['AVENOR AFTER.jpg', 'AVENOR AFTER.webp'],
  ['HIT%20BEFORE.jpg', 'HIT BEFORE.webp'],
  ['HIT BEFORE.jpg', 'HIT BEFORE.webp'],
  ['HIT%20AFTER.jpg', 'HIT AFTER.webp'],
  ['HIT AFTER.jpg', 'HIT AFTER.webp'],
  ['1PS%20BEFORE.jpg', '1PS BEFORE.webp'],
  ['1PS BEFORE.jpg', '1PS BEFORE.webp'],
  ['1PS%20aFTER.jpg', '1PS aFTER.webp'],
  ['1PS aFTER.jpg', '1PS aFTER.webp'],
  ['SWYCHR%20BEFORE.jpg', 'SWYCHR BEFORE.webp'],
  ['SWYCHR BEFORE.jpg', 'SWYCHR BEFORE.webp'],
  ['SWYCHR%20AFTER.jpg', 'SWYCHR AFTER.webp'],
  ['SWYCHR AFTER.jpg', 'SWYCHR AFTER.webp'],
  ['TOC%20BEFORE.png', 'TOC BEFORE.webp'],
  ['TOC BEFORE.png', 'TOC BEFORE.webp'],
  ['TOC%20AFTER.png', 'TOC AFTER.webp'],
  ['TOC AFTER.png', 'TOC AFTER.webp'],
  ['WAGESTREEM%20BEFORE.jpg', 'WAGESTREEM BEFORE.webp'],
  ['WAGESTREEM BEFORE.jpg', 'WAGESTREEM BEFORE.webp'],
  ['WAGE%20STREAM%20AFTER.jpg', 'WAGE STREAM AFTER.webp'],
  ['WAGE STREAM AFTER.jpg', 'WAGE STREAM AFTER.webp'],
  ['wysa%20before.jpg', 'wysa before.webp'],
  ['wysa before.jpg', 'wysa before.webp'],
  ['wysa%20after.jpg', 'wysa after.webp'],
  ['wysa after.jpg', 'wysa after.webp'],
  ['wavye%20BEFORE.jpg', 'wavye BEFORE.webp'],
  ['wavye BEFORE.jpg', 'wavye BEFORE.webp'],
  ['wavye%20AFTER.jpg', 'wavye AFTER.webp'],
  ['wavye AFTER.jpg', 'wavye AFTER.webp']
];

beforeAfters.forEach(([oldName, newName]) => {
  html = html.split(`assets/Before%20and%20afters/${oldName}`).join(`assets/Before and afters/${newName}`);
  html = html.split(`assets/Before and afters/${oldName}`).join(`assets/Before and afters/${newName}`);
});

// Add loading="lazy" decoding="async" to all before-and-after img tags
html = html.replace(/<div class="t-card-img-wrap"><img src="assets\/Before and afters\/([^"]+)"\s*alt="([^"]+)"\s*\/><\/div>/g,
  '<div class="t-card-img-wrap"><img src="assets/Before and afters/$1" alt="$2" loading="lazy" decoding="async" /></div>');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Updated index.html successfully.');

// 2. Update other html files for favicons and card header
const otherPages = ['services.html', 'projects.html', 'journal.html'];
otherPages.forEach(p => {
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes(oldFavicon)) {
    content = content.replace(oldFavicon, newFavicon);
  }
  content = content.replace('src="assets/card hader.png"', 'src="assets/card hader.webp" loading="lazy" decoding="async"');
  content = content.replace('src="/assets/card hader.png"', 'src="/assets/card hader.webp" loading="lazy" decoding="async"');
  if (!content.includes('id="scrollProgressBar"')) {
    content = content.replace('<body>', '<body>\n\n  <!-- Luxury Hairline Scroll Progress Bar -->\n  <div class="scroll-progress-bar" id="scrollProgressBar" aria-hidden="true"></div>');
  }
  fs.writeFileSync(p, content, 'utf8');
  console.log(`Updated ${p} with compliant favicons and scroll progress bar.`);
});
