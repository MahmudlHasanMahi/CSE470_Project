import React from "react";
import { Box } from "@mui/material";
import { CountUp, fadeUp } from "../pages/Employee/motion";
import { motion } from "framer-motion";
import { alpha } from "@mui/material/styles";
import { Typography } from "@mui/material";
import { money } from "../pages/Employee/mockData";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { GrowWidth } from "../pages/Employee/motion";

const shade = (b, fallback) => `rgba(255,255,255,${b.shade || fallback})`;

const TreasuryHero = ({
  scope,
  wallets,
  budgets,
  totalBalance,
  totalBudget,
  range,
}) => {
  const { user } = scope;
  const title = "Available Personal & Shared Allowance";
  const [used, limit] = range;

  return (
    <Box
      component={motion.div}
      variants={fadeUp}
      sx={{
        color: "#fff",
        borderRadius: "12px",
        p: 3,
        display: "flex",
        flexDirection: "column",

        justifyContent: "space-between",
        background: (t) =>
          `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${alpha(t.palette.primary.main, 0.85)} 100%)`,
        boxShadow: (t) => `0 16px 36px ${alpha(t.palette.primary.main, 0.28)}`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ opacity: 0.85, fontSize: 13.5 }}>
            {title}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              mt: 0.75,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <CountUp value={totalBalance} format={money} />
          </Typography>
          <Typography sx={{ opacity: 0.85, mt: 0.5, fontSize: 13 }}>
            Across {wallets.length} active EkPocket wallets
          </Typography>
        </Box>

        <Box sx={{ width: 120, height: 120, flexShrink: 0 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={budgets}
                dataKey="spent"
                nameKey="category"
                innerRadius={36}
                outerRadius={54}
                paddingAngle={3}
                stroke="none"
              >
                {budgets.map((b, i) => (
                  <Cell key={b.id} fill={shade(b, 1 - i * 0.18)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      <Box sx={{ mt: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 0.75,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            "Personal Monthly Limit Used"
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {money(used)} of {money(limit)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            height: 10,
            borderRadius: 6,
            overflow: "hidden",
            bgcolor: "rgba(0,0,0,0.22)",
            gap: "2px",
          }}
        >
          {budgets.map((b, i) => (
            <GrowWidth
              key={b.id}
              width={`${totalBudget ? (b.spent / totalBudget) * 100 : 0}%`}
              delay={0.3 + i * 0.1}
              sx={{ bgcolor: shade(b, 0.85) }}
            />
          ))}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.75,
            mt: 1.25,
          }}
        >
          {budgets.slice(0, 4).map((b) => (
            <Box
              key={b.id}
              sx={{ display: "flex", alignItems: "center", gap: 0.6 }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: shade(b, 0.85),
                }}
              />
              <Typography variant="caption" sx={{ opacity: 0.92 }}>
                {b.category.split(" ")[0]}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default TreasuryHero;
