import React, { useState } from "react";
import "./App.css";

const App = () => {
  const [buyOrders, setBuyOrders] = useState([]);
  const [sellOrders, setSellOrders] = useState([]);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [orderType, setOrderType] = useState("buy");      // "buy" or "sell"
  const [orderMethod, setOrderMethod] = useState("market"); // "market" or "limit"
  const [currentMarketPrice, setCurrentMarketPrice] = useState(27); // Dynamic market price

  // Matching engine for limit orders.
  // Returns the remaining quantity that wasn't matched.
  const matchOrder = (newOrder, type) => {
    let remainingQuantity = newOrder.quantity;
    if (type === "buy") {
      // For a buy limit, match with sell orders at or below the new order's price.
      let orders = [...sellOrders].sort((a, b) => a.price - b.price);
      let updatedOrders = [];
      orders.forEach(order => {
        if (remainingQuantity <= 0) {
          updatedOrders.push(order);
        } else if (order.price <= newOrder.price) {
          // A trade occurs—update market price to newOrder.price.
          if (order.quantity > remainingQuantity) {
            updatedOrders.push({ ...order, quantity: order.quantity - remainingQuantity });
            remainingQuantity = 0;
          } else {
            remainingQuantity -= order.quantity;
          }
        } else {
          updatedOrders.push(order);
        }
      });
      setSellOrders(updatedOrders);
      return remainingQuantity;
    } else if (type === "sell") {
      // For a sell limit, match with buy orders at or above the new order's price.
      let orders = [...buyOrders].sort((a, b) => b.price - a.price);
      let updatedOrders = [];
      orders.forEach(order => {
        if (remainingQuantity <= 0) {
          updatedOrders.push(order);
        } else if (order.price >= newOrder.price) {
          // A trade occurs—update market price to newOrder.price.
          if (order.quantity > remainingQuantity) {
            updatedOrders.push({ ...order, quantity: order.quantity - remainingQuantity });
            remainingQuantity = 0;
          } else {
            remainingQuantity -= order.quantity;
          }
        } else {
          updatedOrders.push(order);
        }
      });
      setBuyOrders(updatedOrders);
      return remainingQuantity;
    }
  };

  // Matching engine for market orders (ignores price conditions)
  // Returns an object containing remaining quantity and total cost/revenue.
  const processMarketOrder = (newOrder, type) => {
    let remaining = newOrder.quantity;
    let lastExecutedPrice = null;
    if (type === "buy") {
      // Market buy: match with all sell orders starting with the lowest price.
      let orders = [...sellOrders].sort((a, b) => a.price - b.price);
      let updatedOrders = [];
      let totalCost = 0;
      orders.forEach(order => {
        if (remaining <= 0) {
          updatedOrders.push(order);
        } else {
          let fill = Math.min(order.quantity, remaining);
          remaining -= fill;
          totalCost += fill * order.price;
          lastExecutedPrice = order.price;
          if (order.quantity > fill) {
            updatedOrders.push({ ...order, quantity: order.quantity - fill });
          }
        }
      });
      setSellOrders(updatedOrders);
      // Update market price to last executed trade price if any.
      if (lastExecutedPrice !== null) setCurrentMarketPrice(lastExecutedPrice);
      return { remaining, totalCost };
    } else if (type === "sell") {
      // Market sell: match with all buy orders starting with the highest price.
      let orders = [...buyOrders].sort((a, b) => b.price - a.price);
      let updatedOrders = [];
      let totalRevenue = 0;
      orders.forEach(order => {
        if (remaining <= 0) {
          updatedOrders.push(order);
        } else {
          let fill = Math.min(order.quantity, remaining);
          remaining -= fill;
          totalRevenue += fill * order.price;
          lastExecutedPrice = order.price;
          if (order.quantity > fill) {
            updatedOrders.push({ ...order, quantity: order.quantity - fill });
          }
        }
      });
      setBuyOrders(updatedOrders);
      if (lastExecutedPrice !== null) setCurrentMarketPrice(lastExecutedPrice);
      return { remaining, totalRevenue };
    }
  };

  const addOrder = () => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    if (orderMethod === "market") {
      const newOrder = { quantity: qty, id: Date.now() };
      if (orderType === "buy") {
        const { remaining, totalCost } = processMarketOrder(newOrder, "buy");
        if (remaining > 0) {
          // If liquidity is insufficient, fill remainder at fallback currentMarketPrice.
          const fallbackCost = remaining * currentMarketPrice;
          alert(
            `Market Buy partially filled.\nTotal Cost: $${(totalCost + fallbackCost).toFixed(
              2
            )} (Remaining ${remaining} units filled at $${currentMarketPrice} each)`
          );
        } else {
          alert(`Market Buy filled.\nTotal Cost: $${totalCost.toFixed(2)}`);
        }
      } else {
        const { remaining, totalRevenue } = processMarketOrder(newOrder, "sell");
        if (remaining > 0) {
          const fallbackRevenue = remaining * currentMarketPrice;
          alert(
            `Market Sell partially filled.\nTotal Revenue: $${(totalRevenue + fallbackRevenue).toFixed(
              2
            )} (Remaining ${remaining} units filled at $${currentMarketPrice} each)`
          );
        } else {
          alert(`Market Sell filled.\nTotal Revenue: $${totalRevenue.toFixed(2)}`);
        }
      }
      return;
    }

    // For limit orders, a valid price is required.
    const prc = parseFloat(price);
    if (isNaN(prc) || prc <= 0) return;
    const newOrder = { price: prc, quantity: qty, id: Date.now() };

    if (orderType === "buy") {
      const remaining = matchOrder(newOrder, "buy");
      // If some quantity was executed (trade occurred), update market price.
      if (qty > remaining) setCurrentMarketPrice(prc);
      if (remaining > 0) {
        setBuyOrders([...buyOrders, { ...newOrder, quantity: remaining }]);
      }
    } else {
      const remaining = matchOrder(newOrder, "sell");
      if (qty > remaining) setCurrentMarketPrice(prc);
      if (remaining > 0) {
        setSellOrders([...sellOrders, { ...newOrder, quantity: remaining }]);
      }
    }

    setPrice("");
    setQuantity("");
  };

  const removeOrder = (id, type) => {
    if (type === "buy") {
      setBuyOrders(buyOrders.filter((order) => order.id !== id));
    } else {
      setSellOrders(sellOrders.filter((order) => order.id !== id));
    }
  };

  return (
    <div className="container">
      {/* Heading */}
      <h1 className="top-heading">Opinion King</h1>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Column: Order Book */}
        <div className="order-book">
          <div className="orders">
            <h2>Sell Orders</h2>
            <ul>
              {sellOrders.map((order) => (
                <li key={order.id}>
                  <span>
                    Price: ${order.price} | Qty: {order.quantity}
                  </span>
                  <button onClick={() => removeOrder(order.id, "sell")}>X</button>
                </li>
              ))}
            </ul>
          </div>
          <div className="orders">
            <h2>Buy Orders</h2>
            <ul>
              {buyOrders.map((order) => (
                <li key={order.id}>
                  <span>
                    Price: ${order.price} | Qty: {order.quantity}
                  </span>
                  <button onClick={() => removeOrder(order.id, "buy")}>X</button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Market Price & Order Form */}
        <div className="right-panel">
          <div className="market-price-box">
            <h2>
              Current Market Price: <span>${currentMarketPrice}</span>
            </h2>
          </div>
          <div className="order-form">
            <div className="toggle-group">
              <button
                className={`toggle-button ${orderType === "buy" ? "active" : ""}`}
                onClick={() => setOrderType("buy")}
              >
                Buy
              </button>
              <button
                className={`toggle-button ${orderType === "sell" ? "active" : ""}`}
                onClick={() => setOrderType("sell")}
              >
                Sell
              </button>
            </div>
            <div className="toggle-group">
              <button
                className={`toggle-button ${orderMethod === "market" ? "active" : ""}`}
                onClick={() => setOrderMethod("market")}
              >
                Market
              </button>
              <button
                className={`toggle-button ${orderMethod === "limit" ? "active" : ""}`}
                onClick={() => setOrderMethod("limit")}
              >
                Limit
              </button>
            </div>
            {orderMethod === "limit" && (
              <input
                type="number"
                placeholder="Enter Limit Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            )}
            <input
              type="number"
              placeholder="Enter Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <button className="place-order-btn" onClick={addOrder}>
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
