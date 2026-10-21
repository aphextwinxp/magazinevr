# Магазин VR (WebXR)

VR-симулятор магазина в браузере: расставляй товары, продавай их на кассе, зарабатывай деньги.
Стек: **Three.js + WebXR + Vite**, хостинг: **GitHub Pages**.

## Запуск на компьютере
```bash
npm install
npm run dev
```
Откройте адрес из консоли. Для теста VR без шлема поставьте расширение
**Immersive Web Emulator** (Meta) в Chrome.

## Публикация на GitHub Pages
1. Создайте репозиторий на GitHub и загрузите все файлы (ветка `main`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. После каждого `git push` во вкладке **Actions** запускается деплой.
4. Игра откроется по адресу `https://<ник>.github.io/<репозиторий>/`.

```bash
git init
git add .
git commit -m "Первый коммит"
git branch -M main
git remote add origin https://github.com/<ник>/<репозиторий>.git
git push -u origin main
```

## Управление в VR
| Действие | Кнопка |
|---|---|
| Ходьба | левый стик |
| Поворот | правый стик (рывками) |
| Взять / отпустить предмет | курок или grip |

## Игровой цикл (прототип)
1. Товары появляются в зоне поставки на столе справа.
2. Расставьте их по полкам слева.
3. Положите товар на зелёную зону кассы — он продан, деньги капают на табло.
4. Прогресс (деньги) сохраняется в браузере.

## Структура
```
index.html
vite.config.js
src/main.js        # вся игра прототипа
.github/workflows/deploy.yml
```
