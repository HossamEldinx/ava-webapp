// This file is responsible for taking special data (often from ONLV documents)
// and turning it into proper HTML that can be displayed in a web browser.
// It also makes sure that the HTML is safe to display, preventing any bad code from running.

// The main idea is to convert different types of data "nodes" (which can be simple text,
// lists, bold text, etc.) into their corresponding HTML tags. For example, a "p" node
// becomes a `<p>` tag, and a "b" node becomes a `<strong>` tag.
// This ensures that the rich text formatting from the original ONLV data is preserved
// when shown to the user.

import React, { useMemo } from "react"; // We need React to build our user interface, and `useMemo` to make our component efficient.
import DOMPurify from "dompurify"; // This is a special tool that helps us clean up HTML to make sure it's safe and doesn't contain any harmful code.

// --- Helper Function (generateHtmlString) ---
// This function takes a "node" (a piece of data that represents content) and turns it into an HTML string.
export const generateHtmlString = (node) => {
    // If there's no node, we return an empty string.
    if (!node) return "";
    let html = ""; // This variable will store the HTML we build.

    // If the node is just a simple text (string) or a number, we use it directly as HTML.
    if (typeof node === "string") html = node;
    else if (typeof node === "number") html = String(node);
    // If the node is a list (array), we go through each item in the list and convert it to HTML,
    // joining them with `<br/>` (a line break) to put each item on a new line.
    else if (Array.isArray(node))
        html = node.map(generateHtmlString).join("<br/>");
    // If the node is a more complex object (like a paragraph, bold text, or a list), we process its parts.
    else if (typeof node === "object" && node !== null) {
        let content = ""; // This will hold the HTML content for the current node.
        // If the node has a direct text content (like `#text`), we add it.
        if (node["#text"]) content += node["#text"];
        // If it's a paragraph (`p`), we convert its content to HTML.
        if (node.p) {
            const pContent = Array.isArray(node.p)
                ? node.p.map(generateHtmlString).join("\n") // If `p` is an array, join with newlines.
                : generateHtmlString(node.p); // Otherwise, convert the single `p` content.
            content += pContent === "" ? "<p></p>" : pContent; // Add `<p></p>` if empty, otherwise the content.
        }
        // If it's bold text (`b`), we wrap it in `<strong>` tags.
        if (node.b) content += `<strong>${generateHtmlString(node.b)}</strong>`;
        // If it's an unordered list (`ul`), we wrap it in `<ul>` tags.
        if (node.ul) content += `<ul>${generateHtmlString(node.ul)}</ul>`;
        // If it's a list item (`li`), we wrap it in `<li>` tags.
        if (node.li) {
            const liContent = Array.isArray(node.li)
                ? node.li
                      .map((item) => `<li>${generateHtmlString(item)}</li>`)
                      .join("")
                : `<li>${generateHtmlString(node.li)}</li>`;
            content += liContent;
        }
        // If it's a line break (`br`), we add `<br/>` tags.
        if (node.br) {
            const brCount = Array.isArray(node.br)
                ? node.br.filter((br) => br === "").length
                : node.br === ""
                ? 1
                : 0;
            if (brCount > 0) {
                content += "<br/>".repeat(brCount);
            } else if (node.br && !Array.isArray(node.br)) {
                // Handle non-empty <br> (though typically <br> is empty)
            }
        }
        // If it's superscript (`sup`), we wrap it in `<sup>` tags.
        if (node.sup) content += `<sup>${generateHtmlString(node.sup)}</sup>`;
        // If it's an "al" reference, we add it with "Ref:".
        if (node.al) content += ` <i>(Ref: ${generateHtmlString(node.al)})</i>`;
        // If it's a "bieterluecke" (bid gap), we add a special span.
        if (node.bl !== undefined)
            content += `<span class="bieterluecke">[Bieterlücke]</span>`;

        html = content; // The built content becomes our HTML.
    }
    // Finally, we clean up the HTML:
    // - Replace three or more consecutive `<br/>` tags with just two.
    // - Replace multiple spaces with a single space.
    // - Remove leading/trailing spaces.
    return html
        .replace(/(\s*<br\s*\/>\s*){3,}/gi, "<br/><br/>")
        .replace(/\s+/g, " ")
        .trim();
};

// --- RenderHtml Component ---
// This is a React component that takes a "node" and safely renders its HTML content.
export const RenderHtml = React.memo(({ node }) => {
    // `useMemo` helps us remember the `rawHtml` so it's only recalculated if the `node` changes.
    const rawHtml = useMemo(() => {
        if (!node) return ""; // If no node, no HTML.
        return generateHtmlString(node); // Convert the node to a raw HTML string.
    }, [node]); // Only re-run this if `node` changes.

    // `useMemo` also helps us remember the `sanitizedHtml` so it's only recalculated if `rawHtml` changes.
    const sanitizedHtml = useMemo(() => {
        if (!rawHtml) return ""; // If no raw HTML, no sanitized HTML.
        try {
            // We only sanitize if we are in a browser environment (where `window` exists).
            if (typeof window !== "undefined") {
                // We use DOMPurify to clean the HTML, allowing standard HTML tags.
                return DOMPurify.sanitize(rawHtml, {
                    USE_PROFILES: { html: true },
                });
            }
            return rawHtml; // If not in a browser, we return the raw HTML (less safe, but for server-side rendering).
        } catch (error) {
            // If something goes wrong during sanitization, we log an error and return a placeholder.
            console.error(
                "Error sanitizing HTML:",
                error,
                "Raw HTML:",
                rawHtml
            );
            return "[Render Error]";
        }
    }, [rawHtml]); // Only re-run this if `rawHtml` changes.

    // This part is for debugging: it logs information about the node and the HTML being rendered,
    // especially useful for tracking issues with "folgeposition" long texts.
    if (node && (node.p || Array.isArray(node))) {
        console.log("RenderHtml debug:", {
            node: node,
            rawHtml: rawHtml,
            sanitizedHtml: sanitizedHtml,
            willRender: !(
                !sanitizedHtml ||
                sanitizedHtml === "<p></p>" ||
                sanitizedHtml.trim() === "" ||
                sanitizedHtml === "[Render Error]"
            ),
        });
    }

    // If the node is invalid, or the sanitized HTML is empty or an error, we return nothing.
    if (
        !node ||
        !sanitizedHtml ||
        sanitizedHtml === "<p></p>" ||
        sanitizedHtml.trim() === "" ||
        sanitizedHtml === "[Render Error]"
    ) {
        return null;
    }

    // Finally, we render the sanitized HTML using `dangerouslySetInnerHTML`.
    // This is a React feature that allows us to insert raw HTML, but because we've
    // sanitized it with DOMPurify, it's safe to use here.
    return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
});
