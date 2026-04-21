# Git Rules

Этот файл для информации по текущему проекту.

## Что уже настроено

- Репозиторий GitHub: `https://github.com/marketing-ast/todd`
- Основная ветка: `main`
- Проект Vercel: `landingbuh`
- Прод-домен: `https://bukh.site`
- Резервный домен Vercel: `https://landingbuh.vercel.app`

## Как теперь деплоить

Отдельно деплоить в Vercel не надо.

Схема такая:

1. Изменить файлы сайта локально.
2. Выполнить:

```bash
git add .
git commit -m "обновил сайт"
git push origin main
```

3. После `git push origin main` Vercel сам заберет изменения из GitHub и сам сделает новый deploy.

## Важно

- Этот проект теперь должен оставаться статическим сайтом.
- Серверный код для деплоя не нужен.
- Отдельную команду `vercel deploy` использовать не нужно, если только не требуется аварийный ручной деплой.

## Нужные данные

- GitHub owner: `marketing-ast`
- GitHub repo: `todd`
- Git remote: `origin`
- Production branch: `main`
- Vercel team/account: `armanimoney-4056s-projects`
- Vercel project: `landingbuh`

## Примечание

Если после `git push` нужно проверить обновление сайта, открывать:

- `https://bukh.site`
- `https://landingbuh.vercel.app`
