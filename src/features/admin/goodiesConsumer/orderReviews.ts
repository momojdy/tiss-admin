/** Apply only server-returned review records to the matching customer's order snapshots. */
export function applyOrderReviews(orders: any[], reviews: any[], locale: string) {
  for (const order of orders) {
    const forOrder = reviews.filter(review => review.order_id === order.backendId);
    const summary = (review: any) => review ? {r: review.rating, t: review.comment, d: new Date(review.created_at).toLocaleDateString(locale)} : undefined;
    const store = forOrder.find(review => review.target === 'store');
    const driver = forOrder.find(review => review.target === 'driver');
    order.rated = store?.rating || 0;order.driverRated = driver?.rating || 0;
    order.orderReview = summary(store);order.driverReview = summary(driver);
  }
}
