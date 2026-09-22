package com.largata.support;

import java.lang.reflect.Method;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;


public final class RoutesUnderTheThreshold {

    private static final Pattern A_TRIP_NAMED_BY_ITS_ID = Pattern.compile("^/v1/trips/\\{[^/}]+}(/.*)?$");

    private RoutesUnderTheThreshold() {}


    public record Handler(Class<?> controller, Method method, String route, RequestMethod httpMethod) {

        public String name() {
            return controller.getSimpleName() + "#" + method.getName();
        }

        public boolean isARead() {
            return httpMethod == RequestMethod.GET || httpMethod == RequestMethod.HEAD || httpMethod == RequestMethod.OPTIONS;
        }

        public Path source() {
            return Path.of("src/main/java", controller.getName().replace('.', '/') + ".java");
        }
    }


    public static List<Handler> everyHandler() {
        List<Handler> handlers = new ArrayList<>();
        for (Class<?> controller : restControllers()) {
            String prefix = prefixOf(controller);
            for (Method method : controller.getDeclaredMethods()) {
                RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
                if (mapping == null) {
                    continue;
                }
                String[] paths = mapping.path().length > 0 ? mapping.path() : new String[] {""};
                RequestMethod[] methods = mapping.method().length > 0 ? mapping.method() : new RequestMethod[] {RequestMethod.GET};
                for (String path : paths) {
                    for (RequestMethod httpMethod : methods) {
                        handlers.add(new Handler(controller, method, prefix + path, httpMethod));
                    }
                }
            }
        }
        return handlers;
    }


    public static List<Handler> underTheScope() {
        return everyHandler().stream().filter(h -> A_TRIP_NAMED_BY_ITS_ID.matcher(h.route()).matches()).toList();
    }


    private static List<Class<?>> restControllers() {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        List<Class<?>> found = new ArrayList<>();
        scanner.findCandidateComponents("com.largata").forEach(candidate -> {
            try {
                found.add(Class.forName(candidate.getBeanClassName()));
            } catch (ClassNotFoundException e) {
                throw new IllegalStateException(e);
            }
        });
        return found;
    }


    private static String prefixOf(Class<?> controller) {
        RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(controller, RequestMapping.class);
        if (mapping == null || mapping.path().length == 0) {
            return "";
        }
        return mapping.path()[0];
    }
}
