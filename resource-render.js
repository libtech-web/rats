// resource-render.js
// Shared by every category page (and by admin.html for live preview).
// Takes an array of resource objects and injects the same markup
// the site has always used, so styles.css needs no changes.

function renderResourceEntry(resource) {
  const paragraphs = (resource.annotation || [])
    .map((p) => `        <p>\n          ${p}\n        </p>`)
    .join("\n");

  return `
    <div class="resource-entry">

      <h2 class="resource-title">${resource.title}</h2>

      <p class="citation">
        <span class="label">MLA Citation</span>
        <span class="citation-text">${resource.citation}</span>
      </p>

      <div class="category-field">
        <span class="label">Topic</span>
        <span class="value">${resource.topic}</span>
      </div>

      <figure class="resource-image">
        <img src="${resource.image}" alt="${resource.imageAlt}">
        <figcaption>${resource.caption}</figcaption>
      </figure>

      <div class="annotation">
        <span class="kicker">Why We Picked This</span>
        <h3>Annotation</h3>
${paragraphs}
      </div>

    </div>`;
}

function renderResourceList(containerId, resources) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!resources || resources.length === 0) {
    container.innerHTML =
      '<p style="color:var(--peach); text-align:center;">No resources have been added to this page yet.</p>';
    return;
  }
  container.innerHTML = resources.map(renderResourceEntry).join("\n");
}
