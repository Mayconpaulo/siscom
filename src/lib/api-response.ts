export async function readApiResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json") || body.trimStart().startsWith("{")) {
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new Error("O servidor enviou uma resposta incompleta. Tente novamente.");
    }
  }

  if (response.status === 401 || response.redirected) {
    throw new Error("Sua sessão expirou. Entre novamente no SISCOM e repita o envio.");
  }
  if (response.status === 413) {
    throw new Error("O arquivo é muito grande para envio. Selecione um arquivo menor que 15 MB.");
  }

  throw new Error("O serviço de importação está temporariamente indisponível. Atualize a página e tente novamente.");
}
