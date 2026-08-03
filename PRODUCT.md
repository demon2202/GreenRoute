# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 18, Mapbox GL, React Router v6, H3-js (hexagonal spatial index), Socket.io-client, Express, MongoDB

## Users

Both everyday eco-conscious commuters (drivers, cyclists, walkers) aiming to lower emissions and track carbon savings, and community/fleet users competing on leaderboards and claiming territory.

## Product Purpose

GreenRoute enables eco-friendly route planning, real-time carbon emission calculations, trip logging, and interactive gamified territory claiming via H3 spatial hexagons to incentivize sustainable mobility choices.

## Positioning

Combines precise Mapbox navigation and eco-route optimization with an interactive H3 hexagon territory takeover game and real-time carbon reduction leaderboards.

## Operating Context

Used on desktop and mobile web browsers during pre-trip planning, live route navigation, territory exploration, and reviewing historical carbon impact analytics.

## Capabilities and Constraints

- Eco-friendly route planning and geocoding via Mapbox GL.
- Real-time carbon emission savings calculation and trip history tracking.
- Interactive spatial territory grid using Uber H3-js with Socket.io real-time updates.
- Leaderboard rankings for top eco-travelers.
- Seamless Light and Dark mode theme support.
- Web platform (React SPA + Express/MongoDB backend).

## Brand Commitments

- Product Name: GreenRoute
- Tone & Voice: Eco-conscious, motivating, modern, tech-forward.
- Design: High visual polish, supporting both Light and Dark mode seamlessly.

## Evidence on Hand

- Existing React application in `client/` with routes for `/` (RoutePlanner), `/leaderboard`, `/territory`, `/history`, `/preferences`, `/saved`, and `/settings`.
- Express server in `server/` with Socket.io real-time server and MongoDB data persistence.

## Product Principles

1. **Carbon Impact First**: Make carbon savings metrics visible, clear, and rewarding at every step.
2. **Fluid Navigation**: Keep map interactions, search geocoding, and route selection responsive and effortless.
3. **Playful Spatial Gamification**: Leverage H3 territory grids and live leaderboards to make sustainable transit engaging.
4. **Cohesive Light/Dark Aesthetic**: Maintain high contrast, visual clarity, and elegance across both light and dark visual themes.

## Accessibility & Inclusion

- High-contrast visual indicators for map layers, route polylines, and carbon stats cards.
- Keyboard accessible search inputs and controls.
