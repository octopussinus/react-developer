import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

export function NotFound() {
  const { t } = useTranslation('nav');
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-2xl font-bold">{t('notFoundTitle')}</h1>
      <p className="text-muted-foreground">{t('notFoundBody')}</p>
      {/* A link, styled like a button -- never a <button> wrapping an <a>. */}
      <Link
        to="/"
        className={cn(
          'inline-flex min-h-11 items-center justify-center rounded-md px-4',
          'bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90',
        )}
      >
        {t('backToHome')}
      </Link>
    </div>
  );
}
