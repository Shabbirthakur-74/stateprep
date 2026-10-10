import { cn } from '@/lib/utils';
import { ImgHTMLAttributes } from 'react';

/** The reading-panda logo on a white rounded tile, so it reads on light and dark backgrounds alike. Size it with className. */
export default function AppLogoIcon({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return <img src="/images/logo.png" alt="" {...props} className={cn('shrink-0 rounded-lg bg-white object-contain', className)} />;
}
