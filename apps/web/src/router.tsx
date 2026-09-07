import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { Home } from './routes/home';
import { NotFound } from './routes/not-found';

export type HomeSearch = { id_token?: string };

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): HomeSearch =>
    typeof search['id_token'] === 'string'
      ? { id_token: search['id_token'] }
      : {},
  component: Home,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute]),
  defaultNotFoundComponent: NotFound,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
