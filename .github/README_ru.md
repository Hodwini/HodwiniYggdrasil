# TypedrasilService — Кастомный сервис авторизации для Minecraft

> [!WARNING] Предупреждение <br>
> Данный проект не имеет никакого отношения к Mojang Studios.
> Я не несу ответственность за то, как вы используете данный сервис.

Думаю каждый владелец своего Minecraft-проекта или небольшого сервера, хотел обладать возможностью кастомного авторизации со своей системой скинов и плащями, иными словами — быть независимыми от Mojang и диктовать свои правила для своего проекта.

**TypedrasilService** — закроет вашу боль. Это готовый Backend-проект с лёгкой установкой на сервер через Docker.

# Теория

Авторизация Minecraft основана на протоколе [Yggdrasil](https://ru.wikipedia.org/wiki/Yggdrasil) — это протокол с помощью которого можно создать mesh-сеть, которая будет работать поверх другой сети (overlay).

Теперь давайте рассмотрим более подробно, как это на самом деле работает.





## Локальная разработка

Для того, чтобы локально развернуть проект вам понадобиться:

- [Bun](https://bun.sh/)
- [Docker](https://docker.com/products/docker-desktop/)
- [PostgreSQL](https://postgresql.org/)

Далее вам нужно выполнить несколько шагов для запуска сервиса локально:

1. Склонируйте этот Git-репозиторий:

```bash
git clone https://github.com/Hodwini/Typedrasil.git
```
2. Войдите в директорию и установите зависимости

```bash
cd Typedrasil
bun install
```
3. Создайте файл `.env`, скопируйте значения из `.example.env` и обязательно заполните

```shell
# Server Bootstrap
NODE_ENV=development
SERVER_PORT=
CORS_ORIGIN=

# Server Security
JWT_SECRET=
JWT_TOKEN=
JWT_EXPIRATION=

# PostgreSQL
DB_NAME=
DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=

# Redis
REDIST_HOST=
```
**Важно** без локального запущенного PostgreSQL — у вас не получиться запустить проект.

4. Проведите миграцию в базу данных

```shell
bun db:migrate
```
5. Запустите проект

```bash
# Локально
bun dev

# В Docker-контейнере
docker-compose up -d
```

Готово.

## Деплой сервиса

Для запуска сервиса на вашей Linux-машине обязательно должен быть установлен Docker.

