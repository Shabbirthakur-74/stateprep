import PublicLayout, { type PublicPageProps } from '@/layouts/public-layout';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';

type LegalPage = 'terms' | 'privacy' | 'user-policy';

/** Placeholder text: replace each section's body with your own wording before launch. */
const pages: Record<LegalPage, { title: string; sections: { heading: string; body: string }[] }> = {
    terms: {
        title: 'Terms & Conditions',
        sections: [
            { heading: 'Using the platform', body: 'Describe who may use the platform and what is expected of them.' },
            { heading: 'Accounts', body: 'Explain account creation, keeping login details safe and when accounts may be closed.' },
            { heading: 'Content and copyright', body: 'State who owns the mock tests, questions and study material, and how they may be used.' },
            { heading: 'Payments and refunds', body: 'Set out how paid content is purchased and your refund rules.' },
            { heading: 'Changes to these terms', body: 'Explain how and when these terms may be updated.' },
        ],
    },
    privacy: {
        title: 'Privacy Policy',
        sections: [
            { heading: 'What we collect', body: 'List the personal information collected, such as name, email address and test activity.' },
            { heading: 'How we use it', body: 'Explain why the information is collected and how it is used.' },
            { heading: 'Sharing', body: 'State whether, and with whom, information is shared.' },
            { heading: 'Your choices', body: 'Explain how users can view, correct or delete their information.' },
            { heading: 'Contact', body: 'Give an address for privacy questions.' },
        ],
    },
    'user-policy': {
        title: 'User Policy',
        sections: [
            { heading: 'Fair use', body: 'Describe acceptable use of tests and material, such as no sharing of accounts or copying of content.' },
            { heading: 'Conduct', body: 'Set out the behaviour expected from users.' },
            { heading: 'Enforcement', body: 'Explain what happens when the policy is broken.' },
        ],
    },
};

export default function Legal({ page, authPrompt }: PublicPageProps & { page: LegalPage }) {
    const { name } = usePage<SharedData>().props;
    const { title, sections } = pages[page];

    return (
        <PublicLayout authPrompt={authPrompt}>
            <Head title={title} />
            <article className="mx-auto max-w-3xl px-4 py-14">
                <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    How {name} works for you. This page is a draft and will be updated with the full text.
                </p>
                <div className="mt-10 space-y-8">
                    {sections.map(({ heading, body }, index) => (
                        <section key={heading}>
                            <h2 className="font-display text-lg font-semibold">
                                {index + 1}. {heading}
                            </h2>
                            <p className="text-muted-foreground mt-2 leading-relaxed">{body}</p>
                        </section>
                    ))}
                </div>
            </article>
        </PublicLayout>
    );
}
