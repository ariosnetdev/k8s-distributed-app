import { html } from 'hono/html'

type LayoutProps = {
    title: string,
    extraJs?: string[]
    extraCss?: string[]
    children?: any
}

export const Layout = ({
    title,
    extraJs = [],
    extraCss = [],
    children
}: LayoutProps) => {
    return html`<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    </head>
    <body class="bg-gray-900 p-8">
        ${children}

        ${extraJs.map((script) => {
            return html`<script src="${script}" type="module"></script>`
        })}
    </body>
</html>`
}
