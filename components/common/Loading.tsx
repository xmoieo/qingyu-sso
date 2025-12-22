import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';
import Typography from '@mui/joy/Typography';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message = '加载中...', fullScreen = false }: LoadingProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: fullScreen ? '100vh' : '100%',
        width: '100%',
        minHeight: fullScreen ? 'unset' : 200,
        gap: 2,
      }}
    >
      <CircularProgress size="lg" variant="soft" />
      {message && (
        <Typography level="body-sm" color="neutral">
          {message}
        </Typography>
      )}
    </Box>
  );
}
