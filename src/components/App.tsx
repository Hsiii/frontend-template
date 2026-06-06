import type { JSX } from 'react';

export function App(): JSX.Element {
    return (
        <main className='app'>
            <section className='app__content'>
                <h1 className='app__title'>Vite or Next.js.</h1>
                <p className='app__description'>
                    create-hsi-app kick starts your frontend project with the
                    stack you choose.
                </p>
            </section>
        </main>
    );
}
