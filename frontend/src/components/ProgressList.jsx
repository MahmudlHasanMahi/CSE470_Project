import { Panel } from "../pages/Employee/components/SharedUI";
import { Meter } from "../pages/Employee/components/SharedUI";
import { Box, Typography } from "@mui/material";
import { Caption } from "../pages/Employee/components/SharedUI";

const ProgressList = ({
  title,
  subtitle,
  items,
  getValue,
  getLabel,
  getDetails,
  getColor,
  limit = 4,
}) => {
  return (
    <Panel title={title} subtitle={subtitle}>
      <Box sx={{ display: "grid", gap: 2.25 }}>
        {items.slice(0, limit).map((item, i) => {
          const pct = getValue(item);

          return (
            <Box key={item.id}>
              <Meter
                value={pct}
                delay={0.25 + i * 0.08}
                color={getColor?.(item, pct)}
                left={
                  <Typography variant="body2" fontWeight={600}>
                    {getLabel(item)}
                  </Typography>
                }
                right={<Caption>{pct}%</Caption>}
              />

              {getDetails && (
                <Caption block sx={{ mt: 0.35 }}>
                  {getDetails(item)}
                </Caption>
              )}
            </Box>
          );
        })}
      </Box>
    </Panel>
  );
};
export default ProgressList;
