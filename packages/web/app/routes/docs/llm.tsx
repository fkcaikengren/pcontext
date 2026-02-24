import type { LoaderFunctionArgs } from "react-router";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { docSlug } = params;
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/docs/${docSlug}/query?${searchParams.toString()}`;

  try {
    const headers = new Headers();
    const cookie = request.headers.get("Cookie");
    if (cookie) {
      headers.set("Cookie", cookie);
    }

    const response = await fetch(apiUrl, {
      headers,
    });

    if (!response.ok) {
      return new Response(response.statusText, { status: response.status });
    }

    const data = await response.json();
    const snippets = data.data?.snippets || [];
    const text = snippets.map((snippet: any) => `source: ${snippet.filePath}

${snippet.content}

---------------------------
`).join('\n');

    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error fetching query:", error);
    return new Response("Internal Server Error", { status: 200, headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      }, });
  }
}
