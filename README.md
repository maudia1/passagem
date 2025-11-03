# Controle de Passagens

Aplicação estática para controlar corridas, pagamentos e abastecimentos com sincronização opcional no Supabase.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/)
- Opcional: [docker compose](https://docs.docker.com/compose/) v2

## Estrutura

```
public/              # Arquivos estáticos do site
supabase/            # Scripts SQL para criar tabelas e seeds no Supabase
Dockerfile           # Define a imagem baseada em NGINX
Docker-compose.yml   # Sobe o site em http://localhost:8080
```

## Rodando com Docker

1. Construa a imagem
   ```bash
   docker compose build
   ```

2. Suba o container
   ```bash
   docker compose up
   ```

3. Acesse [http://localhost:8080](http://localhost:8080)

Para parar, use `docker compose down`.

## Variáveis Supabase

O front-end utiliza os valores definidos diretamente em `public/script.js` (`SUPABASE_URL` e `SUPABASE_ANON_KEY`).
Caso queira apontar para outro projeto, altere estes valores antes de gerar a imagem.

## Executando sem Docker

É possível usar qualquer servidor estático (ex.: `python -m http.server 8080`) apontando para a pasta `public/`.
