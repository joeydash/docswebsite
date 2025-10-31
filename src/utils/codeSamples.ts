/**
 * Generates code samples for different languages/tools (robust + aliases)
 */

export interface CodeSampleOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string; // raw body (often JSON)
  queryParams?: Record<string, string>;
}

/* ---------- helpers ---------- */
const up = (s: string) => (s || "").toUpperCase();

function buildUrlWithParams(url: string, qp?: Record<string, string>) {
  if (!qp || !Object.keys(qp).length) return url;
  const params = new URLSearchParams(qp);
  return url + (url.includes("?") ? "&" : "?") + params.toString();
}

function hasBody(method: string, body?: string) {
  const m = up(method);
  return !!body && !(m === "GET" || m === "HEAD");
}

const safeSQ = (s = "") => s.replace(/'/g, "\\'");
const safeDQ = (s = "") => s.replace(/"/g, '\\"');

function tryParseJSON(text?: string): { isJSON: boolean; pretty?: string } {
  if (!text) return { isJSON: false };
  try {
    const obj = JSON.parse(text);
    return { isJSON: true, pretty: JSON.stringify(obj, null, 2) };
  } catch {
    return { isJSON: false };
  }
}

/* ---------- cURL ---------- */
export function generateCurlSample({ method, url, headers, body, queryParams }: CodeSampleOptions): string {
  url = buildUrlWithParams(url, queryParams);
  let out = `curl -X ${up(method)} '${safeSQ(url)}'`;
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      out += ` \\\n  -H '${safeSQ(k)}: ${safeSQ(v)}'`;
    }
  }
  if (hasBody(method, body)) out += ` \\\n  -d '${safeSQ(body!)}'`;
  return out;
}

/* ---------- JavaScript (fetch) ---------- */
export function generateJavaScriptSample({ method, url, headers, body, queryParams }: CodeSampleOptions): string {
  const fetchUrl = buildUrlWithParams(url, queryParams);
  const init: any = { method: up(method) };
  if (headers && Object.keys(headers).length) init.headers = headers;
  if (hasBody(method, body)) init.body = body;
  return `fetch('${safeSQ(fetchUrl)}', ${JSON.stringify(init, null, 2)})\n  .then(r => r.json())\n  .then(console.log);`;
}

/* ---------- JavaScript (Axios) ---------- */
export function generateJavaScriptAxiosSample({ method, url, headers, body, queryParams }: CodeSampleOptions): string {
  const cfg: any = { method: method.toLowerCase(), url };
  if (queryParams && Object.keys(queryParams).length) cfg.params = queryParams;
  if (headers && Object.keys(headers).length) cfg.headers = headers;
  if (hasBody(method, body)) cfg.data = body;
  return `axios(${JSON.stringify(cfg, null, 2)})\n  .then(res => console.log(res.data));`;
}

/* ---------- TypeScript (fetch) ---------- */
export function generateTypeScriptSample(opts: CodeSampleOptions): string {
  const fetchUrl = buildUrlWithParams(opts.url, opts.queryParams);
  const init: any = { method: up(opts.method) };
  if (opts.headers && Object.keys(opts.headers).length) init.headers = opts.headers;
  if (hasBody(opts.method, opts.body)) init.body = opts.body;
  return `const init: RequestInit = ${JSON.stringify(init, null, 2)};\nconst res = await fetch('${safeSQ(fetchUrl)}', init);\nconst data = await res.json();\nconsole.log(data);`;
}

/* ---------- TypeScript (Axios) ---------- */
export function generateTypeScriptAxiosSample(opts: CodeSampleOptions): string {
  const cfg: any = { method: opts.method.toLowerCase(), url: opts.url };
  if (opts.queryParams && Object.keys(opts.queryParams).length) cfg.params = opts.queryParams;
  if (opts.headers && Object.keys(opts.headers).length) cfg.headers = opts.headers;
  if (hasBody(opts.method, opts.body)) cfg.data = opts.body;
  return `import type { AxiosRequestConfig } from 'axios';\nconst config: AxiosRequestConfig = ${JSON.stringify(cfg, null, 2)};\nconst { data } = await axios(config);\nconsole.log(data);`;
}

/* ---------- Python (requests) ---------- */
export function generatePythonSample({ method, url, headers, body, queryParams }: CodeSampleOptions): string {
  const requestUrl = buildUrlWithParams(url, queryParams);
  const lines: string[] = ["import requests", "", `url = "${safeDQ(requestUrl)}"`];

  if (headers && Object.keys(headers).length) {
    lines.push("headers = {");
    for (const [k, v] of Object.entries(headers)) lines.push(`  "${safeDQ(k)}": "${safeDQ(v)}",`);
    lines.push("}");
  }

  const methodLower = method.toLowerCase();
  const hdr = headers && Object.keys(headers).length ? ", headers=headers" : "";
  const data = hasBody(method, body) ? `, data='${safeSQ(body!)}'` : "";
  lines.push(`response = requests.${methodLower}(url${hdr}${data})`);
  lines.push("print(response.status_code)");
  lines.push("print(response.text)");
  return lines.join("\n");
}

/* ---------- C# (HttpClient + HttpRequestMessage) ---------- */
export function generateCSharpSample({ method, url, headers, body, queryParams }: CodeSampleOptions): string {
  const fullUrl = buildUrlWithParams(url, queryParams);
  const m = up(method);
  return `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program {
  static async Task Main() {
    using var client = new HttpClient();
${Object.entries(headers || {}).map(([k, v]) => `    client.DefaultRequestHeaders.Add("${safeDQ(k)}", "${safeDQ(v)}");`).join("\n")}
    var req = new HttpRequestMessage(new HttpMethod("${m}"), "${safeDQ(fullUrl)}");
${hasBody(method, body) ? `    req.Content = new StringContent("${safeDQ(body!)}", Encoding.UTF8, "application/json");` : ""}
    var resp = await client.SendAsync(req);
    Console.WriteLine((int)resp.StatusCode);
    Console.WriteLine(await resp.Content.ReadAsStringAsync());
  }
}`;
}

/* ---------- Go (net/http) ---------- */
export function generateGoSample({ method, url, headers, body, queryParams }: CodeSampleOptions): string {
  const fullUrl = buildUrlWithParams(url, queryParams);
  return `package main

import (
  "bytes"
  "fmt"
  "io"
  "net/http"
)

func main() {
  var buf *bytes.Buffer
${hasBody(method, body) ? `  buf = bytes.NewBuffer([]byte(${JSON.stringify(body || "")}))` : `  buf = nil`}
  req, _ := http.NewRequest("${up(method)}", "${fullUrl}", buf)
${Object.entries(headers || {}).map(([k, v]) => `  req.Header.Set("${safeDQ(k)}", "${safeDQ(v)}")`).join("\n")}
  resp, err := http.DefaultClient.Do(req)
  if err != nil { panic(err) }
  defer resp.Body.Close()
  b, _ := io.ReadAll(resp.Body)
  fmt.Println(resp.Status)
  fmt.Println(string(b))
}`;
}

/* ---------- Java (HttpClient) ---------- */
export function generateJavaSample({ method, url, headers, body, queryParams }: CodeSampleOptions): string {
  const fullUrl = buildUrlWithParams(url, queryParams);
  const { isJSON, pretty } = tryParseJSON(body);
  const bodyExpr = hasBody(method, body)
    ? isJSON ? `\"\"\"${(pretty as string).replace(/`/g, "\\`")}\"\"\"` : `\"\"\"${safeDQ(body!)}\"\"\"`
    : null;

  return `import java.net.http.*;
import java.net.URI;
import java.time.Duration;

public class ApiClient {
  public static void main(String[] args) throws Exception {
    var client = HttpClient.newHttpClient();
${bodyExpr ? `    var body = ${bodyExpr};` : ""}
    var req = HttpRequest.newBuilder()
      .uri(URI.create("${safeDQ(fullUrl)}"))
${Object.entries(headers || {}).map(([k, v]) => `      .header("${safeDQ(k)}", "${safeDQ(v)}")`).join("\n")}
      .method("${up(method)}", ${bodyExpr ? "HttpRequest.BodyPublishers.ofString(body)" : "HttpRequest.BodyPublishers.noBody()"})
      .timeout(Duration.ofSeconds(30))
      .build();
    var resp = client.send(req, HttpResponse.BodyHandlers.ofString());
    System.out.println(resp.statusCode());
    System.out.println(resp.body());
  }
}`;
}

/* ---------- PHP (cURL) ---------- */
export function generatePhpSample({ method, url, headers, body, queryParams }: CodeSampleOptions): string {
  const fullUrl = buildUrlWithParams(url, queryParams);
  const hdr = Object.entries(headers || {}).map(([k, v]) => `${k}: ${v}`);
  return `<?php
$ch = curl_init();
curl_setopt_array($ch, [
  CURLOPT_URL => '${safeSQ(fullUrl)}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => '${up(method)}',${hasBody(method, body) ? `
  CURLOPT_POSTFIELDS => ${JSON.stringify(body || "")},` : ""}
  CURLOPT_HTTPHEADER => ${JSON.stringify(hdr, null, 2)}
]);
$response = curl_exec($ch);
if ($response === false) { echo 'cURL Error: ' . curl_error($ch) . \"\\n\"; }
curl_close($ch);
echo $response;`;
}

/* ---------- Ruby (Net::HTTP) ---------- */
export function generateRubySample({ method, url, headers, body, queryParams }: CodeSampleOptions): string {
  const fullUrl = buildUrlWithParams(url, queryParams);
  const m = up(method);
  const klass =
    m === "GET" ? "Get" :
    m === "POST" ? "Post" :
    m === "PUT" ? "Put" :
    m === "PATCH" ? "Patch" :
    m === "DELETE" ? "Delete" : "GenericRequest";
  return `require 'net/http'
require 'uri'

uri = URI.parse('${safeSQ(fullUrl)}')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = (uri.scheme == 'https')
request = Net::HTTP::${klass}.new(uri)
${Object.entries(headers || {}).map(([k, v]) => `request['${safeSQ(k)}'] = '${safeSQ(v)}'`).join("\n")}
${hasBody(method, body) ? `request.body = ${JSON.stringify(body || "")}` : ""}
response = http.request(request)
puts response.code
puts response.body`;
}

/* ---------- Swift (URLSession) ---------- */
export function generateSwiftSample({ method, url, headers, body, queryParams }: CodeSampleOptions): string {
  const fullUrl = buildUrlWithParams(url, queryParams);
  return `import Foundation

let url = URL(string: "${safeDQ(fullUrl)}")!
var request = URLRequest(url: url)
request.httpMethod = "${up(method)}"
${Object.entries(headers || {}).map(([k, v]) => `request.addValue("${safeDQ(v)}", forHTTPHeaderField: "${safeDQ(k)}")`).join("\n")}
${hasBody(method, body) ? `request.httpBody = ${JSON.stringify((body || ""))}.data(using: .utf8)` : ""}

let task = URLSession.shared.dataTask(with: request) { data, response, error in
  if let error = error { print(error); return }
  guard let data = data else { return }
  print(String(data: data, encoding: .utf8) ?? "")
}
task.resume()`;
}

/* ---------- aggregator with aliases ---------- */
export function generateCodeSamples(options: CodeSampleOptions) {
  // Validate input options
  if (!options || typeof options !== 'object') {
    console.warn('Invalid code sample options provided');
    return {};
  }
  
  const safeOptions = {
    method: typeof options.method === 'string' ? options.method : 'GET',
    url: typeof options.url === 'string' ? options.url : '',
    headers: options.headers && typeof options.headers === 'object' ? options.headers : undefined,
    body: typeof options.body === 'string' ? options.body : undefined,
    queryParams: options.queryParams && typeof options.queryParams === 'object' ? options.queryParams : undefined,
  };
  
  if (!safeOptions.url) {
    console.warn('No URL provided for code samples');
    return {};
  }

  const js = generateJavaScriptSample(options);
  const jsAxios = generateJavaScriptAxiosSample(options);
  const ts = generateTypeScriptSample(options);
  const tsAxios = generateTypeScriptAxiosSample(options);

  return {
    // canonical keys
    curl: generateCurlSample(options),
    javascript: js,
    javascriptAxios: jsAxios,
    typescript: ts,
    typescriptAxios: tsAxios,
    python: generatePythonSample(options),
    csharp: generateCSharpSample(options),
    go: generateGoSample(options),
    java: generateJavaSample(options),
    php: generatePhpSample(options),
    ruby: generateRubySample(options),
    swift: generateSwiftSample(options),

    // backward-compat aliases (so old dropdowns still work)
    fetch: js,
    axios: jsAxios,
    ts: ts,
    tsAxios: tsAxios,
  };
}
