# Droid Serif

Arquivos originais, sem modificações, do Android Open Source Project:

- [DroidSerif-Regular.ttf](https://android.googlesource.com/platform/frameworks/base/+/5933a49/data/fonts/DroidSerif-Regular.ttf): peso 400.
- [DroidSerif-Bold.ttf](https://android.googlesource.com/platform/frameworks/base/+/5933a49/data/fonts/DroidSerif-Bold.ttf): peso 700.
- [NOTICE](https://android.googlesource.com/platform/frameworks/base/+/5933a49/data/fonts/NOTICE): copyright e licença Apache 2.0, preservados em `NOTICE.txt`.

Obtidos em 21/10/2026 da revisão `5933a49`. O carregamento por `next/font/local`
em `src/app/layout.tsx` restringe a fonte aos algarismos `U+0030-0039`.
As letras e a pontuação continuam usando a família correspondente ao contexto.
Os dígitos têm a mesma largura nas versões regular e negrito.

A licença também acompanha o deploy em `/font-licenses/DroidSerif.txt`.
